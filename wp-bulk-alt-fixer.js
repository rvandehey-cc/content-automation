/**
 * WordPress Bulk Alt Text Fixer
 * 
 * This script iterates through all images in the Media Library grid view
 * and copies Caption to Alt Text for each one.
 * 
 * How it works in Grid View:
 * 1. Finds all attachment thumbnails in the grid
 * 2. Clicks each one to open the details panel
 * 3. Copies Caption to Alt Text
 * 4. Moves to the next image
 * 5. Reports results when done
 */

(async function() {
  // Get all attachment items in the grid
  const attachments = document.querySelectorAll('.attachment:not(.save-ready)');
  
  if (attachments.length === 0) {
    alert('No images found in grid. Make sure you are in Grid View in the Media Library.');
    return;
  }
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Helper to wait for element
  const waitFor = (selector, timeout = 2000) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = document.querySelector(selector);
        if (el) resolve(el);
        else if (Date.now() - start > timeout) resolve(null);
        else setTimeout(check, 100);
      };
      check();
    });
  };
  
  // Helper to wait a bit
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  
  for (let i = 0; i < attachments.length; i++) {
    try {
      // Click the attachment to open details
      attachments[i].click();
      
      // Wait for the detail panel to load
      await delay(300);
      
      const caption = document.querySelector('#attachment-details-two-column-caption');
      const alt = document.querySelector('#attachment-details-two-column-alt-text');
      
      if (caption && alt && caption.value.trim() && !alt.value.trim()) {
        alt.value = caption.value;
        alt.dispatchEvent(new Event('change', { bubbles: true }));
        alt.dispatchEvent(new Event('input', { bubbles: true }));
        fixed++;
        console.log(`✅ Fixed: Image ${i + 1}`);
      } else if (alt && alt.value.trim()) {
        skipped++;
        console.log(`⏭️ Skipped: Image ${i + 1} (already has alt text)`);
      } else {
        skipped++;
        console.log(`⏭️ Skipped: Image ${i + 1} (no caption to copy)`);
      }
      
      // Small delay to let WordPress save
      await delay(200);
      
    } catch (e) {
      errors++;
      console.error(`❌ Error on image ${i + 1}:`, e);
    }
  }
  
  // Close the modal
  const closeBtn = document.querySelector('.media-modal-close');
  if (closeBtn) closeBtn.click();
  
  alert(`✅ Bulk Alt Text Fix Complete!\n\nFixed: ${fixed}\nSkipped: ${skipped}\nErrors: ${errors}\nTotal: ${attachments.length}`);
})();
