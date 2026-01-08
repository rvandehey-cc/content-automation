/**
 * @fileoverview Command-line interface utilities
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import readline from 'readline';

/**
 * CLI utility class for user interactions
 */
export class CLI {
  constructor() {
    this.rl = null;
  }

  /**
   * Ask user for permission with custom message
   * @param {string} message - The question to ask
   * @param {boolean} defaultYes - Default to yes if true
   * @returns {Promise<boolean>} User's response
   */
  async askPermission(message, defaultYes = false) {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    return new Promise((resolve) => {
      const defaultChoice = defaultYes ? 'Y/n' : 'y/N';
      this.rl.question(`\n❓ ${message} (${defaultChoice}): `, (answer) => {
        if (defaultYes) {
          resolve(!answer.toLowerCase().startsWith('n'));
        } else {
          resolve(answer.toLowerCase().startsWith('y'));
        }
      });
    });
  }

  /**
   * Ask user for text input
   * @param {string} question - The question to ask
   * @param {string} defaultValue - Default value if empty input
   * @returns {Promise<string>} User's input
   */
  async askInput(question, defaultValue = '') {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  /**
   * Get dealer configuration interactively
   * @returns {Promise<Object>} Dealer configuration
   */
  async getDealerConfig() {
    const config = {};
    
    config.dealerSlug = await this.askInput('🏢 Enter dealer slug (for image URLs)');
    
    const useCurrentDate = await this.askPermission('📅 Use current date for image paths?', true);
    
    if (useCurrentDate) {
      const now = new Date();
      config.year = now.getFullYear().toString();
      config.month = (now.getMonth() + 1).toString().padStart(2, '0');
    } else {
      config.year = await this.askInput('📅 Enter year (YYYY)');
      config.month = await this.askInput('📅 Enter month (MM)');
      
      // Ensure proper formatting
      config.year = config.year.padStart(4, '0');
      config.month = config.month.padStart(2, '0');
    }
    
    return config;
  }

  /**
   * Ask user for multiple element selectors to remove/ignore during sanitization
   * @returns {Promise<Array<string>>} Array of CSS selectors
   */
  async askForCustomSelectors() {
    console.log('\n🎯 Custom Element Removal');
    console.log('='.repeat(60));
    console.log('You can specify CSS selectors for elements to remove or ignore during sanitization.');
    console.log('Examples:');
    console.log('  • .advertisement, .sidebar-widget');
    console.log('  • #social-share, [class*="popup"]');
    console.log('  • div.newsletter, section.promotional');
    console.log('  • Leave empty to skip custom removal');
    console.log('');

    const selectors = [];
    let continueAdding = true;
    let selectorIndex = 1;

    while (continueAdding) {
      const selector = await this.askInput(
        `Enter CSS selector ${selectorIndex} (or press Enter to finish):`,
        ''
      );

      if (selector.trim()) {
        selectors.push(selector.trim());
        selectorIndex++;
        console.log(`   ✅ Added: ${selector.trim()}`);
      } else {
        continueAdding = false;
      }
    }

    if (selectors.length > 0) {
      console.log(`\n✅ Added ${selectors.length} custom selector(s) for removal:`);
      selectors.forEach((sel, idx) => {
        console.log(`   ${idx + 1}. ${sel}`);
      });
    } else {
      console.log('\n⏭️  No custom selectors added - using default sanitization');
    }

    return selectors;
  }

  /**
   * Display step header with formatting
   * @param {string|number} stepNumber - Step number or identifier
   * @param {string} title - Step title
   * @param {string} description - Step description
   */
  displayStepHeader(stepNumber, title, description) {
    console.log('\n' + '='.repeat(80));
    console.log(`🚀 STEP ${stepNumber}: ${title}`);
    console.log('='.repeat(80));
    console.log(description);
    console.log('');
  }

  /**
   * Display a formatted info message
   * @param {string} title - Message title
   * @param {Array<string>} items - List of items to display
   */
  displayInfo(title, items = []) {
    console.log(`\n📋 ${title}:`);
    items.forEach(item => {
      console.log(`   ${item}`);
    });
  }

  /**
   * Display a formatted warning message
   * @param {string} message - Warning message
   */
  displayWarning(message) {
    console.log(`\n⚠️  ${message}`);
  }

  /**
   * Display a formatted success message
   * @param {string} message - Success message
   */
  displaySuccess(message) {
    console.log(`\n✅ ${message}`);
  }

  /**
   * Display a formatted error message
   * @param {string} message - Error message
   */
  displayError(message) {
    console.log(`\n❌ ${message}`);
  }

  /**
   * Display results summary
   * @param {Object} results - Results object with counts
   */
  displayResultsSummary(results) {
    console.log('\n📊 RESULTS SUMMARY:');
    console.log('='.repeat(60));
    
    Object.entries(results).forEach(([key, value]) => {
      const icon = this._getIconForResultType(key);
      console.log(`   ${icon} ${this._formatResultKey(key)}: ${value}`);
    });
  }

  /**
   * Get appropriate icon for result type
   * @private
   * @param {string} key - Result key
   * @returns {string} Appropriate emoji icon
   */
  _getIconForResultType(key) {
    const iconMap = {
      successful: '✅',
      failed: '❌',
      skipped: '⏭️',
      processed: '🔧',
      downloaded: '📥',
      generated: '📄',
      total: '📊'
    };
    
    return iconMap[key.toLowerCase()] || '📋';
  }

  /**
   * Format result key for display
   * @private
   * @param {string} key - Result key
   * @returns {string} Formatted key
   */
  _formatResultKey(key) {
    return key.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * Display next steps
   * @param {Array<string>} steps - Array of step descriptions
   */
  displayNextSteps(steps) {
    console.log('\n🎯 Next Steps:');
    steps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
  }

  /**
   * Clean up CLI resources
   */
  cleanup() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

/**
 * Singleton CLI instance
 */
export const cli = new CLI();

/**
 * Ensure cleanup on process exit
 */
process.on('exit', () => cli.cleanup());
process.on('SIGINT', () => {
  cli.cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cli.cleanup();
  process.exit(0);
});
