
// waiting for DOM to fully load before running script
document.addEventListener('DOMContentLoaded', () => {
    // get references to DOM elements
    const numWebsitesInput = document.getElementById('num-websites');
    const websiteContainer = document.getElementById('website-container');
    const websiteForm = document.getElementById('website-form');
    
    // array to store website URLs
    let websiteUrls = [];
    
    // listen for changes in the number input
    numWebsitesInput.addEventListener('change', (e) => {
        // converting input value to integer
        const numWebsites = parseInt(e.target.value);
        // clear existing fields
        websiteContainer.innerHTML = '';
        
        // generating new input fields based on number entered
        for (let i = 0; i < numWebsites; i++) {
            // creating container for each website input
            const inputDiv = document.createElement('div');
            // adding HTML for label and input
            inputDiv.innerHTML = `
            <label for="website-${i}">Website ${i + 1} URL:</label>
            <input type="url" 
            id="website-${i}" 
            name="website-${i}" 
            placeholder="https://example.com"
            required>
            `;
            // add new input to container
            websiteContainer.appendChild(inputDiv);
        }
    });
    
    // handle form submission
    websiteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        websiteUrls = [];
        
        try {
            // get all URL inputs
            const inputs = websiteContainer.querySelectorAll('input[type="url"]');
            inputs.forEach(input => {
                if (input.value) {
                    websiteUrls.push(input.value);
                }
            });
            
            if (websiteUrls.length === 0) {
                throw new Error('please enter at least one URL');
            }
            
            // show loading state
            const submitButton = websiteForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'processing...';
            
            // sending URLs to backend
            const response = await fetch('/save-urls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ urls: websiteUrls })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'failed to process URLs');
            }
            // if success - enabling PDF download else trowing error
            alert('screenshots captured! click OK to download PDF');
            window.location.href = '/download-pdf';
            
        } catch (error) {
            alert('error: ' + error.message);
            console.error('error:', error);
        } finally {
            // reset button state
            const submitButton = websiteForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'submit';
        }
    });
});

