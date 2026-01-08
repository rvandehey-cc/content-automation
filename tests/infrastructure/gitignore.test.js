import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

describe('Git Ignore Configuration', () => {
    const projectRoot = process.cwd();
    const gitignorePath = path.join(projectRoot, '.gitignore');

    // Story 6.6: BMAD Automation Artifacts
    describe('BMAD Automation Artifacts (Story 6.6)', () => {
        let gitignoreContent;

        beforeAll(() => {
            if (fs.existsSync(gitignorePath)) {
                gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            }
        });

        test('.gitignore file should exist', () => {
            const exists = fs.existsSync(gitignorePath);
            expect(exists).toBe(true);
        });

        // AC1: coverage/ directory
        test('should ignore coverage/ directory', () => {
            expect(gitignoreContent).toContain('coverage/');
        });

        // AC2: *.lcov files
        test('should ignore *.lcov files', () => {
            expect(gitignoreContent).toContain('*.lcov');
        });

        // AC3: _bmad-output/.temp/ directory
        test('should ignore _bmad-output/.temp/ directory', () => {
            expect(gitignoreContent).toContain('_bmad-output/.temp/');
        });

        // AC4: _bmad-output/**/*.tmp files
        test('should ignore _bmad-output/**/*.tmp files', () => {
            expect(gitignoreContent).toContain('_bmad-output/**/*.tmp');
        });

        // AC5: Ensure structured output is NOT ignored
        test('should NOT have a blanket ignore for _bmad-output/', () => {
            // Check that we're not ignoring the entire _bmad-output directory
            const lines = gitignoreContent.split('\n');
            const hasBlankIgnore = lines.some(line => {
                const trimmed = line.trim();
                return trimmed === '_bmad-output/' ||
                       trimmed === '_bmad-output' ||
                       trimmed === '_bmad-output/*';
            });
            expect(hasBlankIgnore).toBe(false);
        });

        // AC6: File is documented and version-controlled
        test('.gitignore should have comments documenting BMAD entries', () => {
            // Should have some form of comment about BMAD or test coverage
            const hasComments = gitignoreContent.includes('BMAD') ||
                               gitignoreContent.includes('Test coverage') ||
                               gitignoreContent.includes('Coverage') ||
                               gitignoreContent.includes('Temporary');
            expect(hasComments).toBe(true);
        });

        // Verification tests using git check-ignore
        describe('Git Check-Ignore Verification', () => {
            test('coverage/ directory should be ignored by git', () => {
                try {
                    const result = execSync('git check-ignore coverage/', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    expect(result.trim()).toBe('coverage/');
                } catch (error) {
                    // If exit code is non-zero, the path might already be tracked
                    // Verify the pattern exists in .gitignore instead
                    if (error.status === 1 && gitignoreContent.includes('coverage/')) {
                        // Pattern exists in .gitignore - pass the test
                        expect(gitignoreContent).toContain('coverage/');
                    } else {
                        throw new Error('coverage/ is not being ignored by git');
                    }
                }
            });

            test('*.lcov files should be ignored by git', () => {
                try {
                    const result = execSync('git check-ignore test.lcov', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    expect(result.trim()).toBe('test.lcov');
                } catch (error) {
                    throw new Error('*.lcov files are not being ignored by git');
                }
            });

            test('_bmad-output/.temp/ directory should be ignored by git', () => {
                try {
                    const result = execSync('git check-ignore _bmad-output/.temp/', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    expect(result.trim()).toBe('_bmad-output/.temp/');
                } catch (error) {
                    throw new Error('_bmad-output/.temp/ is not being ignored by git');
                }
            });

            test('_bmad-output/**/*.tmp files should be ignored by git', () => {
                try {
                    const result = execSync('git check-ignore _bmad-output/docs/test.tmp', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    expect(result.trim()).toBe('_bmad-output/docs/test.tmp');
                } catch (error) {
                    throw new Error('_bmad-output/**/*.tmp files are not being ignored by git');
                }
            });

            test('structured BMAD output should NOT be ignored by git', () => {
                // Test that normal markdown files in _bmad-output are NOT ignored
                try {
                    execSync('git check-ignore _bmad-output/epics.md', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    // If we get here, the file IS ignored - that's wrong
                    throw new Error('_bmad-output/epics.md should NOT be ignored');
                } catch (error) {
                    // Exit code 1 means file is NOT ignored - that's what we want
                    if (error.status === 1) {
                        expect(error.status).toBe(1);
                    } else {
                        throw error;
                    }
                }
            });

            test('_bmad-output/docs/ directory files should NOT be ignored by git', () => {
                try {
                    execSync('git check-ignore _bmad-output/docs/architecture.md', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    throw new Error('_bmad-output/docs/ files should NOT be ignored');
                } catch (error) {
                    if (error.status === 1) {
                        expect(error.status).toBe(1);
                    } else {
                        throw error;
                    }
                }
            });

            test('coverage/lcov-report/ files should be ignored by git', () => {
                try {
                    const result = execSync('git check-ignore coverage/lcov-report/index.html', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    expect(result.trim()).toBe('coverage/lcov-report/index.html');
                } catch (error) {
                    // If already tracked, verify pattern exists in .gitignore
                    if (error.status === 1 && gitignoreContent.includes('coverage/')) {
                        expect(gitignoreContent).toContain('coverage/');
                    } else {
                        throw new Error('coverage/ subdirectories are not being ignored');
                    }
                }
            });
        });
    });
});
