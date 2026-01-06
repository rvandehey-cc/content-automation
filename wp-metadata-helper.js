/**
 * WordPress Metadata Helper - "The Fixer"
 * 
 * Instructions:
 * 1. Create a new bookmark in your browser.
 * 2. Name it "Fix WP Metadata".
 * 3. Copy the code below (minified version) into the URL field.
 * 
 * Logic:
 * It looks for the "Caption" field in the currently open Media Modal or Attachment Details screen.
 * It copies that text into the "Alt Text" field if Alt Text is empty.
 * It triggers a save event.
 */

(function() {
    let count = 0;
    
    // 1. Selector for the Media Modal (Grid View / Drag & Drop view)
    // WordPress uses [data-setting="caption"] and [data-setting="alt"]
    const captions = document.querySelectorAll('textarea[data-setting="caption"], input[data-setting="caption"]');
    
    captions.forEach(captionField => {
        // Find the container to scope the search for the matching Alt field
        // Usually they are siblings or close relatives in the DOM
        const container = captionField.closest('.attachment-details') || captionField.closest('.media-frame-content') || document.body;
        const altField = container.querySelector('input[data-setting="alt"]');
        
        if (altField && captionField.value.trim() !== "" && altField.value.trim() === "") {
            // Copy text
            altField.value = captionField.value;
            
            // Trigger WordPress Save (Backbone.js events listen for 'change')
            altField.dispatchEvent(new Event('change', { bubbles: true }));
            altField.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Visual feedback
            altField.style.backgroundColor = "#e6fffa"; // Light green
            count++;
        }
    });

    // 2. Selector for "Edit Media" screen (List View)
    // Uses names like attachments[123][post_excerpt] (Caption) and attachments[123][image_alt]
    if (count === 0) {
        const legacyCaptions = document.querySelectorAll('textarea[name*="[post_excerpt]"]');
        legacyCaptions.forEach(captionField => {
            const nameBase = captionField.name.replace('[post_excerpt]', '');
            const altField = document.querySelector(`input[name="${nameBase}[image_alt]"]`);
            
            if (altField && captionField.value.trim() !== "" && altField.value.trim() === "") {
                altField.value = captionField.value;
                altField.dispatchEvent(new Event('change', { bubbles: true }));
                altField.style.backgroundColor = "#e6fffa";
                count++;
            }
        });
    }

    if (count > 0) {
        alert(`✅ Success! Copied caption to Alt Text for ${count} image(s).`);
    } else {
        alert("ℹ️ No eligible images found.\n\nMake sure:\n1. You have an image selected.\n2. The 'Caption' field has text.\n3. The 'Alt Text' field is empty.");
    }
})();
