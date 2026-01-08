import { execSync } from 'child_process';
import { jest } from '@jest/globals';

describe('Documentation Generation', () => {
  describe('docs:generate npm script', () => {
    it('should exist in package.json scripts', () => {
      const packageJson = JSON.parse(
        execSync('cat package.json', { encoding: 'utf-8' })
      );
      expect(packageJson.scripts).toHaveProperty('docs:generate');
    });

    it('should not be a placeholder script', () => {
      const packageJson = JSON.parse(
        execSync('cat package.json', { encoding: 'utf-8' })
      );
      const docsGenerateScript = packageJson.scripts['docs:generate'];

      // Should not be just an echo placeholder
      expect(docsGenerateScript).not.toContain('not implemented');
      expect(docsGenerateScript).not.toMatch(/^echo.*exit 0$/);
    });

    it('should have a functional implementation', () => {
      const packageJson = JSON.parse(
        execSync('cat package.json', { encoding: 'utf-8' })
      );
      const docsGenerateScript = packageJson.scripts['docs:generate'];

      // Should call a Node.js script or have a command
      expect(docsGenerateScript).toBeTruthy();
      expect(docsGenerateScript.length).toBeGreaterThan(0);
    });

    it('should execute without throwing errors', () => {
      // This test verifies the script runs successfully
      // The actual implementation may warn if BMAD tools are missing, but should not fail
      expect(() => {
        execSync('npm run docs:generate', {
          encoding: 'utf-8',
          stdio: 'pipe' // Suppress output during test
        });
      }).not.toThrow();
    });
  });

  describe('Release workflow documentation step', () => {
    it('should include documentation regeneration step in release.yml', () => {
      const releaseWorkflow = execSync('cat .github/workflows/release.yml', {
        encoding: 'utf-8'
      });

      // Should have a step for regenerating documentation
      expect(releaseWorkflow).toContain('Regenerate Documentation');
      expect(releaseWorkflow).toContain('npm run docs:generate');
    });

    it('should have continue-on-error set to true for documentation step', () => {
      const releaseWorkflow = execSync('cat .github/workflows/release.yml', {
        encoding: 'utf-8'
      });

      // Extract the documentation regeneration step
      const lines = releaseWorkflow.split('\n');
      const docsStepIndex = lines.findIndex(line =>
        line.includes('Regenerate Documentation')
      );

      expect(docsStepIndex).toBeGreaterThan(-1);

      // Look for continue-on-error in the next 10 lines after the step name
      const stepSection = lines.slice(docsStepIndex, docsStepIndex + 10).join('\n');
      expect(stepSection).toContain('continue-on-error: true');
    });

    it('should sync _bmad-output/docs/ to docs/ directory', () => {
      const releaseWorkflow = execSync('cat .github/workflows/release.yml', {
        encoding: 'utf-8'
      });

      // Should have a sync step
      expect(releaseWorkflow).toMatch(/Sync.*docs/i);
      expect(releaseWorkflow).toMatch(/_bmad-output\/docs/);
    });
  });
});
