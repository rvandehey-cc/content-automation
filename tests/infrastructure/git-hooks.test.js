
import fs from 'fs';
import path from 'path';

describe('Git Hooks Infrastructure', () => {
    const projectRoot = process.cwd();
    const hooksDir = path.join(projectRoot, '.husky');

    test('pre-push hook should exist and be executable', () => {
        const hookPath = path.join(hooksDir, 'pre-push');
        
        // Check existence
        const exists = fs.existsSync(hookPath);
        expect(exists).toBe(true);

        if (exists) {
            // Check execution permissions (git hooks need to be executable)
            try {
                fs.accessSync(hookPath, fs.constants.X_OK);
            } catch (err) {
                throw new Error('pre-push hook is not executable');
            }
        }
    });

    test('pre-push hook should contain branch validation logic', () => {
         const hookPath = path.join(hooksDir, 'pre-push');
         if (fs.existsSync(hookPath)) {
            const content = fs.readFileSync(hookPath, 'utf8');
            expect(content).toContain('git rev-parse --abbrev-ref HEAD');
            expect(content).toContain('main');
            expect(content).toContain('dev');
         }
    });
});
