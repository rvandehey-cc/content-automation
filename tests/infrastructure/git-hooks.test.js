
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
            expect(content).toContain('npm run test:coverage');
            expect(content).toContain('npm run lint');
            expect(content).toContain('npm run lint:web');
            expect(content).toContain('validate-docs.js');
         }
    });

    test('pre-push hook should track successful validations in workflow status (Story 6.4)', () => {
        const hookPath = path.join(hooksDir, 'pre-push');
        if (fs.existsSync(hookPath)) {
            const content = fs.readFileSync(hookPath, 'utf8');

            // Should call update-workflow-status.js after validations pass (AC: 3)
            expect(content).toContain('update-workflow-status.js');

            // Should log pre_push_validated event (AC: 4)
            expect(content).toContain('pre_push_validated');

            // Should pass branch name as metadata (AC: 4)
            expect(content).toContain('$current_branch');

            // Should use || true to prevent push failures if status update fails (AC: 5)
            expect(content).toContain('|| true');
        }
    });

    describe('Post-commit Hook (Story 6.3)', () => {
        const postCommitPath = path.join(hooksDir, 'post-commit');

        test('post-commit hook should exist and be executable', () => {
            // AC: 2, 3 - Hook should exist and run after commits
            const exists = fs.existsSync(postCommitPath);
            expect(exists).toBe(true);

            if (exists) {
                // Check execution permissions
                try {
                    fs.accessSync(postCommitPath, fs.constants.X_OK);
                } catch (err) {
                    throw new Error('post-commit hook is not executable');
                }
            }
        });

        test('post-commit hook should extract commit message', () => {
            if (fs.existsSync(postCommitPath)) {
                const content = fs.readFileSync(postCommitPath, 'utf8');

                // AC: 4 - Should use git log to extract commit message
                expect(content).toContain('git log -1 --pretty=%B');
            }
        });

        test('post-commit hook should call workflow status update script', () => {
            if (fs.existsSync(postCommitPath)) {
                const content = fs.readFileSync(postCommitPath, 'utf8');

                // AC: 5 - Should call update-workflow-status.js
                expect(content).toContain('update-workflow-status.js');

                // Should pass "commit_made" event
                expect(content).toContain('commit_made');
            }
        });

        test('post-commit hook should use || true for graceful failure', () => {
            if (fs.existsSync(postCommitPath)) {
                const content = fs.readFileSync(postCommitPath, 'utf8');

                // AC: 6 - Should use || true to prevent commit failures
                expect(content).toContain('|| true');
            }
        });

        test('post-commit hook should be a valid shell script', () => {
            if (fs.existsSync(postCommitPath)) {
                const content = fs.readFileSync(postCommitPath, 'utf8');

                // Should have proper shebang
                expect(content).toMatch(/^#!\/.*sh/);
            }
        });
    });
});
