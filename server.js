//function for taking screenshots of the website and converting them into pdf
import { Cluster } from "puppeteer-cluster";
import { readdirSync, createWriteStream } from "fs";
import { promises as fs, existsSync } from "fs";
import imageToPDF, { sizes } from "image-to-pdf";
import { join } from "path";
import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 4000;

let websiteUrls = [];
let pdfname = "";//pdf name with pdf extension

app.use(express.json());//using json for the body of the request
app.use(express.urlencoded({ extended: true }));//using urlencoded for the body of the request
app.use(express.static(path.join(__dirname)));//using static path for the directory

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

let timestamp;

const screenshots_folder = "./screenshots";
async function prepareScreenshotsFolder(folderPath) {
  if (existsSync(folderPath)) {
    // removing everything inside the folder so the pdf we generated get only require files
    const files = await fs.readdir(folderPath);
    // using loop for removing all dir and files if they exist
    for (const file of files) {
      //getting a filepath properly
      const filePath = join(folderPath, file);
      //getting what is it file or some directory(folder)
      const stats = await fs.lstat(filePath);
      if (stats.isDirectory()) {
        // Remove directory if exist
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        // Remove file if exist
        await fs.unlink(filePath);
      }
    }
  } else {
    // if screenshot folder not exist then create it
    await fs.mkdir(folderPath);
  }
}

// Calling the function
prepareScreenshotsFolder(screenshots_folder)
  //if everything goes right
  .then(() => console.log("Folder is ready!"))
  //if there come any sort of error
  .catch(console.error);

const generated_file_name = (url, extension) => {
  // removing unuse things from the url so we can get the name of the image
  const cleanUrl = url.replace(/https?:\/\//, "").replace(/[^\w.-]/g, "_");
  // taking time stamp for adding in our image
  timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  // now function will return a well organised name for our screenshot and its location
  return `${screenshots_folder}/${cleanUrl}-${timestamp}.${extension}`;
};

async function sscprocess(urls) {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    // maxConcurrency: 3,//used for max no of browser we can open at a instance
  });

  await cluster.task(async ({ page, data: url }) => {
    try {
      // Try to navigate to the URL
      await page.goto(url, { waitUntil: "load", timeout: 20000 }); // added timeout for better error handling
      console.log(`site traveling: ${url}`);

      // create a filename for the screenshot
      const fileName = generated_file_name(url, "png");

      // take a screenshot of the full page
      await page.screenshot({ path: fileName, fullPage: true });
      console.log(`Screenshot saved: ${fileName}`);
    } catch (error) {
      // handle the error if the URL is not valid or there is any issue loading the page
      console.error(`Error loading URL ${url}:`, error.message);
    }
  });
  // getting links from a array by using loop
  for (let index = 0; index < urls.length; index++) {
    const element = urls[index];//getting the element from the array
    cluster.queue(element);
  }
  //runing the anonymus function
  await cluster.idle();
  //close the headless instance
  await cluster.close();
  // calling the pdf function
  pdf();
}

// function for creating pdf
async function pdf() {
  try {
    pdfname = `screenshot-${timestamp}.pdf`;
    const pages = readdirSync("./screenshots").map(//getting all the files from the folder
      (file) => `./screenshots/${file}`//getting the path of the file
    );
    //promise for better error handling
    await new Promise((resolve, reject) => {
      imageToPDF(pages, sizes.A4) //converting images to pdf
        .pipe(createWriteStream(pdfname)) //creating a pdf file
        .on("finish", resolve) //if everything goes right then resolve the promise
        .on("error", reject); //if there is any error then reject the promise
    });

    console.log(`PDF created successfully as ${pdfname}`);
    return pdfname;
  } catch (error) {
    console.error("Error while creating PDF:", error);
    throw error;
  }
}

app.get("/download-pdf", (req, res) => {
  if (!pdfname) {
    return res.status(404).json({ error: "No PDF available" }); //if there is no pdf file then it will return this error
  }
  res.download(pdfname); //if pdf is available then it will download the pdf
});

app.post("/save-urls", async (req, res) => {
  //this is the post request for saving the urls
  try {
    //try block for error handling
    websiteUrls = []; //empty the array of urls so we can get new urls
    if (!req.body || !req.body.urls) {
      return res.status(400).json({
        //if there is no urls in the body of the request then it will return this error
        success: false,
        error: "URLs array is required",
      });
    }
    websiteUrls = [...req.body.urls]; //getting the urls from the body of the request
    await sscprocess(websiteUrls);
    res.json({
      success: true,
      message: "Screenshots process completed",
      downloadUrl: "/download-pdf",
    });
  } catch (error) {
    //if there is any error then it will return the error
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});


export { app };