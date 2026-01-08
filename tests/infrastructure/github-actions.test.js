import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

describe('GitHub Actions Workflow Infrastructure', () => {
    const projectRoot = process.cwd();
    const workflowsDir = path.join(projectRoot, '.github', 'workflows');
    const prValidationPath = path.join(workflowsDir, 'pr-validation.yml');

    test('.github/workflows directory should exist', () => {
        const exists = fs.existsSync(workflowsDir);
        expect(exists).toBe(true);
    });

    test('pr-validation.yml workflow file should exist', () => {
        const exists = fs.existsSync(prValidationPath);
        expect(exists).toBe(true);
    });

    describe('PR Validation Workflow Configuration', () => {
        let workflowConfig;

        beforeAll(() => {
            if (fs.existsSync(prValidationPath)) {
                const content = fs.readFileSync(prValidationPath, 'utf8');
                // Parse YAML manually since we don't have yaml parser installed yet
                workflowConfig = content;
            }
        });

        test('workflow should have correct name', () => {
            expect(workflowConfig).toContain('name: PR Validation');
        });

        test('workflow should trigger on pull_request events', () => {
            expect(workflowConfig).toContain('pull_request:');
        });

        test('workflow should trigger on main and dev branches', () => {
            expect(workflowConfig).toContain('- main');
            expect(workflowConfig).toContain('- dev');
        });

        test('workflow should trigger on opened, synchronize, and reopened PR types', () => {
            expect(workflowConfig).toContain('- opened');
            expect(workflowConfig).toContain('- synchronize');
            expect(workflowConfig).toContain('- reopened');
        });

        test('workflow should run on ubuntu-latest', () => {
            expect(workflowConfig).toContain('runs-on: ubuntu-latest');
        });

        test('workflow should checkout code with full git history', () => {
            expect(workflowConfig).toContain('actions/checkout@v4');
            expect(workflowConfig).toContain('fetch-depth: 0');
        });

        test('workflow should setup Node.js version 20 with npm cache', () => {
            expect(workflowConfig).toContain('actions/setup-node@v4');
            expect(workflowConfig).toContain("node-version: '20'");
            expect(workflowConfig).toContain("cache: 'npm'");
        });

        test('workflow should install dependencies with npm ci', () => {
            expect(workflowConfig).toContain('npm ci');
        });

        test('workflow file should have valid YAML syntax', () => {
            // Basic YAML validation - check for common syntax errors
            expect(workflowConfig).not.toContain('\t'); // No tabs in YAML

            // Check indentation is consistent (should be 2 spaces for GitHub Actions)
            const lines = workflowConfig.split('\n');
            lines.forEach((line, index) => {
                const leadingSpaces = line.match(/^(\s*)/)[1];
                if (leadingSpaces.includes('\t')) {
                    throw new Error(`Tab character found at line ${index + 1}`);
                }
            });
        });

        // Story 4.2: Linting Steps
        describe('Linting Steps (Story 4.2)', () => {
            test('workflow should include CLI linting step', () => {
                expect(workflowConfig).toContain('Lint CLI Code');
                expect(workflowConfig).toContain('npm run lint');
            });

            test('workflow should include web linting step', () => {
                expect(workflowConfig).toContain('Lint Web Code');
                expect(workflowConfig).toContain('npm run lint:web');
            });

            test('linting steps should run after dependency installation', () => {
                const installIndex = workflowConfig.indexOf('npm ci');
                const cliLintIndex = workflowConfig.indexOf('npm run lint');
                const webLintIndex = workflowConfig.indexOf('npm run lint:web');

                expect(installIndex).toBeGreaterThan(-1);
                expect(cliLintIndex).toBeGreaterThan(installIndex);
                expect(webLintIndex).toBeGreaterThan(cliLintIndex);
            });

            test('linting steps should fail workflow on errors (no continue-on-error)', () => {
                // Check that continue-on-error is NOT set for linting steps
                const lines = workflowConfig.split('\n');
                let inLintStep = false;
                let cliLintStepLines = [];
                let webLintStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Lint CLI Code')) {
                        inLintStep = 'cli';
                    } else if (line.includes('Lint Web Code')) {
                        inLintStep = 'web';
                    } else if (line.match(/^\s{6}- name:/)) {
                        inLintStep = false;
                    }

                    if (inLintStep === 'cli') {
                        cliLintStepLines.push(line);
                    } else if (inLintStep === 'web') {
                        webLintStepLines.push(line);
                    }
                });

                // Verify continue-on-error is not set (default is false)
                const cliStepText = cliLintStepLines.join('\n');
                const webStepText = webLintStepLines.join('\n');

                expect(cliStepText).not.toContain('continue-on-error: true');
                expect(webStepText).not.toContain('continue-on-error: true');
            });
        });

        // Story 4.4: Commit Message Validation
        describe('Commit Message Validation (Story 4.4)', () => {
            test('workflow should include commit message validation step', () => {
                expect(workflowConfig).toContain('Validate commit messages');
            });

            test('commitlint step should run after dependency installation', () => {
                const installIndex = workflowConfig.indexOf('npm ci');
                const commitlintIndex = workflowConfig.indexOf('npx commitlint');

                expect(installIndex).toBeGreaterThan(-1);
                expect(commitlintIndex).toBeGreaterThan(installIndex);
            });

            test('commitlint should use correct commit range for PRs', () => {
                // Should use base SHA to head SHA from pull_request context
                expect(workflowConfig).toContain('github.event.pull_request.base.sha');
                expect(workflowConfig).toContain('github.event.pull_request.head.sha');
                expect(workflowConfig).toContain('--from');
                expect(workflowConfig).toContain('--to');
            });

            test('commitlint should run in verbose mode for clear error messages', () => {
                expect(workflowConfig).toContain('--verbose');
            });

            test('commitlint step should fail workflow on invalid commits (no continue-on-error)', () => {
                // Extract the commitlint step
                const lines = workflowConfig.split('\n');
                let inCommitlintStep = false;
                let commitlintStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Validate commit messages')) {
                        inCommitlintStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inCommitlintStep) {
                        inCommitlintStep = false;
                    }

                    if (inCommitlintStep) {
                        commitlintStepLines.push(line);
                    }
                });

                const commitlintStepText = commitlintStepLines.join('\n');
                expect(commitlintStepText).not.toContain('continue-on-error: true');
            });
        });

        // Story 4.3: Test Coverage
        describe('Test Coverage (Story 4.3)', () => {
            test('workflow should include test execution step', () => {
                expect(workflowConfig).toContain('Run Tests with Coverage');
                expect(workflowConfig).toContain('npm run test:coverage');
            });

            test('test step should run after linting steps', () => {
                const cliLintIndex = workflowConfig.indexOf('npm run lint');
                const webLintIndex = workflowConfig.indexOf('npm run lint:web');
                const testIndex = workflowConfig.indexOf('npm run test:coverage');

                expect(testIndex).toBeGreaterThan(cliLintIndex);
                expect(testIndex).toBeGreaterThan(webLintIndex);
            });

            test('workflow should include Codecov upload step', () => {
                expect(workflowConfig).toContain('Upload coverage to Codecov');
                expect(workflowConfig).toContain('codecov/codecov-action@v3');
            });

            test('Codecov step should use correct coverage file path', () => {
                expect(workflowConfig).toContain('file: ./coverage/lcov.info');
            });

            test('Codecov step should have proper flags and naming', () => {
                expect(workflowConfig).toContain('flags: unittests');
                expect(workflowConfig).toContain('name: codecov-umbrella');
            });

            test('Codecov step should not fail CI on upload errors', () => {
                expect(workflowConfig).toContain('fail_ci_if_error: false');
            });

            test('Codecov step should have continue-on-error set to true', () => {
                // Extract the Codecov step
                const lines = workflowConfig.split('\n');
                let inCodecovStep = false;
                let codecovStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Upload coverage to Codecov')) {
                        inCodecovStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inCodecovStep) {
                        inCodecovStep = false;
                    }

                    if (inCodecovStep) {
                        codecovStepLines.push(line);
                    }
                });

                const codecovStepText = codecovStepLines.join('\n');
                expect(codecovStepText).toContain('continue-on-error: true');
            });

            test('test step should fail workflow on test failures (no continue-on-error)', () => {
                // Extract the test step
                const lines = workflowConfig.split('\n');
                let inTestStep = false;
                let testStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Run Tests with Coverage')) {
                        inTestStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inTestStep) {
                        inTestStep = false;
                    }

                    if (inTestStep) {
                        testStepLines.push(line);
                    }
                });

                const testStepText = testStepLines.join('\n');
                expect(testStepText).not.toContain('continue-on-error: true');
            });
        });

        // Documentation Sync Validation
        describe('Documentation Sync Validation', () => {
            test('workflow should include documentation sync validation step', () => {
                expect(workflowConfig).toContain('Validate Documentation Sync');
                expect(workflowConfig).toContain('node .husky/scripts/validate-docs.js');
            });

            test('documentation sync validation should run after tests', () => {
                const testIndex = workflowConfig.indexOf('npm run test:coverage');
                const docsIndex = workflowConfig.indexOf('Validate Documentation Sync');

                expect(testIndex).toBeGreaterThan(-1);
                expect(docsIndex).toBeGreaterThan(testIndex);
            });
        });

        // Story 4.5: Changelog Preview Generation
        describe('Changelog Preview Generation (Story 4.5)', () => {
            test('workflow should include changelog preview generation step', () => {
                expect(workflowConfig).toContain('Generate Changelog Preview');
            });

            test('changelog preview step should run after commit validation', () => {
                const commitlintIndex = workflowConfig.indexOf('Validate commit messages');
                const changelogIndex = workflowConfig.indexOf('Generate Changelog Preview');

                expect(commitlintIndex).toBeGreaterThan(-1);
                expect(changelogIndex).toBeGreaterThan(commitlintIndex);
            });

            test('changelog preview step should use standard-version dry-run', () => {
                expect(workflowConfig).toContain('standard-version --dry-run');
                expect(workflowConfig).toContain('--skip.commit');
                expect(workflowConfig).toContain('--skip.tag');
            });

            test('changelog preview should create markdown file with proper heading', () => {
                expect(workflowConfig).toContain('## 📋 Changelog Preview');
                expect(workflowConfig).toContain('changelog-preview.md');
            });

            test('changelog preview step should handle no conventional commits case', () => {
                expect(workflowConfig).toContain('No conventional commits found');
            });

            test('changelog preview step should have continue-on-error set to true', () => {
                // Extract the changelog preview step
                const lines = workflowConfig.split('\n');
                let inChangelogStep = false;
                let changelogStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Generate Changelog Preview')) {
                        inChangelogStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inChangelogStep) {
                        inChangelogStep = false;
                    }

                    if (inChangelogStep) {
                        changelogStepLines.push(line);
                    }
                });

                const changelogStepText = changelogStepLines.join('\n');
                expect(changelogStepText).toContain('continue-on-error: true');
            });

            test('workflow should upload changelog preview as artifact', () => {
                expect(workflowConfig).toContain('Upload changelog preview artifact');
                expect(workflowConfig).toContain('actions/upload-artifact@v3');
                expect(workflowConfig).toContain('name: changelog-preview');
                expect(workflowConfig).toContain('path: changelog-preview.md');
            });

            test('artifact upload should have retention days configured', () => {
                expect(workflowConfig).toContain('retention-days: 5');
            });

            test('artifact upload step should have continue-on-error set to true', () => {
                // Extract the artifact upload step
                const lines = workflowConfig.split('\n');
                let inArtifactStep = false;
                let artifactStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Upload changelog preview artifact')) {
                        inArtifactStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inArtifactStep) {
                        inArtifactStep = false;
                    }

                    if (inArtifactStep) {
                        artifactStepLines.push(line);
                    }
                });

                const artifactStepText = artifactStepLines.join('\n');
                expect(artifactStepText).toContain('continue-on-error: true');
            });

            test('changelog preview step should run before linting steps', () => {
                const changelogIndex = workflowConfig.indexOf('Generate Changelog Preview');
                const lintIndex = workflowConfig.indexOf('Lint CLI Code');

                expect(changelogIndex).toBeGreaterThan(-1);
                expect(changelogIndex).toBeLessThan(lintIndex);
            });

            test('changelog preview step should have an id for future reference', () => {
                expect(workflowConfig).toContain('id: changelog');
            });
        });

        // Story 4.6: PR Comment with Validation Results
        describe('PR Comment with Validation Results (Story 4.6)', () => {
            test('workflow should have pull-requests write permissions', () => {
                expect(workflowConfig).toContain('permissions:');
                expect(workflowConfig).toContain('pull-requests: write');
            });

            test('workflow should include PR comment step using github-script', () => {
                expect(workflowConfig).toContain('Post PR Comment');
                expect(workflowConfig).toContain('actions/github-script@v7');
            });

            test('PR comment step should run always (even on failure)', () => {
                // Extract the PR comment step
                const lines = workflowConfig.split('\n');
                let inPRCommentStep = false;
                let prCommentStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Post PR Comment')) {
                        inPRCommentStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inPRCommentStep) {
                        inPRCommentStep = false;
                    }

                    if (inPRCommentStep) {
                        prCommentStepLines.push(line);
                    }
                });

                const prCommentStepText = prCommentStepLines.join('\n');
                expect(prCommentStepText).toContain('if: always()');
            });

            test('PR comment step should read changelog preview file', () => {
                // The script should reference changelog-preview.md
                expect(workflowConfig).toContain('changelog-preview.md');
            });

            test('PR comment step should include validation results heading', () => {
                // The comment body should include the heading
                expect(workflowConfig).toContain('🤖 PR Validation Results');
            });

            test('PR comment step should include check summary section', () => {
                expect(workflowConfig).toContain('Check Summary');
            });

            test('PR comment step should include documentation sync in summary', () => {
                expect(workflowConfig).toContain('Documentation Sync');
            });

            test('PR comment step should include workflow run link', () => {
                // Should construct link to workflow run
                expect(workflowConfig).toContain('github.server_url');
                expect(workflowConfig).toContain('github.repository');
                expect(workflowConfig).toContain('github.run_id');
            });

            test('PR comment step should use github.rest.issues.createComment', () => {
                expect(workflowConfig).toContain('github.rest.issues.createComment');
            });

            test('PR comment step should use context for PR number and repo details', () => {
                expect(workflowConfig).toContain('context.issue.number');
                expect(workflowConfig).toContain('context.repo.owner');
                expect(workflowConfig).toContain('context.repo.repo');
            });

            test('PR comment step should run after all validation steps', () => {
                const testIndex = workflowConfig.indexOf('npm run test:coverage');
                const commitlintIndex = workflowConfig.indexOf('npx commitlint');
                const prCommentIndex = workflowConfig.indexOf('Post PR Comment');

                expect(prCommentIndex).toBeGreaterThan(testIndex);
                expect(prCommentIndex).toBeGreaterThan(commitlintIndex);
            });
        });
    });

    // Story 5.1: Release Workflow File
    describe('Release Workflow (Story 5.1)', () => {
        const releasePath = path.join(workflowsDir, 'release.yml');
        let releaseConfig;

        beforeAll(() => {
            if (fs.existsSync(releasePath)) {
                const content = fs.readFileSync(releasePath, 'utf8');
                releaseConfig = content;
            }
        });

        test('release.yml workflow file should exist', () => {
            const exists = fs.existsSync(releasePath);
            expect(exists).toBe(true);
        });

        test('workflow should have correct name "Release & Documentation"', () => {
            expect(releaseConfig).toContain('name: Release & Documentation');
        });

        test('workflow should trigger on push to main branch', () => {
            expect(releaseConfig).toContain('push:');
            expect(releaseConfig).toContain('branches:');
            expect(releaseConfig).toContain('- main');
        });

        test('workflow should have contents write permission', () => {
            expect(releaseConfig).toContain('permissions:');
            expect(releaseConfig).toContain('contents: write');
        });

        test('workflow should have pull-requests write permission', () => {
            expect(releaseConfig).toContain('pull-requests: write');
        });

        test('workflow should have a release job', () => {
            expect(releaseConfig).toContain('release:');
        });

        test('workflow should run on ubuntu-latest', () => {
            expect(releaseConfig).toContain('runs-on: ubuntu-latest');
        });

        test('workflow should checkout code with full git history', () => {
            expect(releaseConfig).toContain('actions/checkout@v4');
            expect(releaseConfig).toContain('fetch-depth: 0');
        });

        test('workflow should setup Node.js version 20 with npm cache', () => {
            expect(releaseConfig).toContain('actions/setup-node@v4');
            expect(releaseConfig).toContain("node-version: '20'");
            expect(releaseConfig).toContain("cache: 'npm'");
        });

        test('workflow should install dependencies with npm ci', () => {
            expect(releaseConfig).toContain('npm ci');
        });

        test('workflow should configure git user as github-actions bot', () => {
            expect(releaseConfig).toContain('git config --global user.name "github-actions[bot]"');
            expect(releaseConfig).toContain('git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"');
        });

        test('workflow file should have valid YAML syntax', () => {
            // Basic YAML validation - check for common syntax errors
            expect(releaseConfig).not.toContain('\t'); // No tabs in YAML

            // Check indentation is consistent (should be 2 spaces for GitHub Actions)
            const lines = releaseConfig.split('\n');
            lines.forEach((line, index) => {
                const leadingSpaces = line.match(/^(\s*)/)[1];
                if (leadingSpaces.includes('\t')) {
                    throw new Error(`Tab character found at line ${index + 1}`);
                }
            });
        });

        // Story 5.2: Version Bump and Changelog Generation
        describe('Version Bump and Changelog Generation (Story 5.2)', () => {
            test('workflow should include test execution step before version bump', () => {
                expect(releaseConfig).toContain('Run Tests');
                expect(releaseConfig).toContain('npm run test:coverage');
            });

            test('test step should run after dependency installation', () => {
                const installIndex = releaseConfig.indexOf('npm ci');
                const testIndex = releaseConfig.indexOf('npm run test:coverage');

                expect(installIndex).toBeGreaterThan(-1);
                expect(testIndex).toBeGreaterThan(installIndex);
            });

            test('test step should fail workflow on test failures (no continue-on-error)', () => {
                // Extract the test step
                const lines = releaseConfig.split('\n');
                let inTestStep = false;
                let testStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Run Tests')) {
                        inTestStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inTestStep) {
                        inTestStep = false;
                    }

                    if (inTestStep) {
                        testStepLines.push(line);
                    }
                });

                const testStepText = testStepLines.join('\n');
                expect(testStepText).not.toContain('continue-on-error: true');
            });

            test('workflow should include version bump step with standard-version', () => {
                expect(releaseConfig).toContain('Bump Version and Generate Changelog');
                expect(releaseConfig).toContain('npx standard-version');
            });

            test('standard-version should use --skip.commit and --skip.tag flags', () => {
                expect(releaseConfig).toContain('--skip.commit');
                expect(releaseConfig).toContain('--skip.tag');
            });

            test('version bump step should run after test execution', () => {
                const testIndex = releaseConfig.indexOf('npm run test:coverage');
                const versionBumpIndex = releaseConfig.indexOf('npx standard-version');

                expect(testIndex).toBeGreaterThan(-1);
                expect(versionBumpIndex).toBeGreaterThan(testIndex);
            });

            test('workflow should extract new version from package.json', () => {
                expect(releaseConfig).toContain('Extract New Version');
            });

            test('version extraction should use Node.js to read package.json', () => {
                // Should use node to read package.json and get version
                expect(releaseConfig).toContain('node -p');
                expect(releaseConfig).toContain('require(\'./package.json\').version');
            });

            test('version extraction step should run after version bump', () => {
                const versionBumpIndex = releaseConfig.indexOf('npx standard-version');
                const extractVersionIndex = releaseConfig.indexOf('Extract New Version');

                expect(versionBumpIndex).toBeGreaterThan(-1);
                expect(extractVersionIndex).toBeGreaterThan(versionBumpIndex);
            });

            test('extracted version should be stored as output variable', () => {
                // Should set version in GITHUB_OUTPUT
                expect(releaseConfig).toContain('GITHUB_OUTPUT');
                expect(releaseConfig).toContain('version=');
            });

            test('version bump step should have an id for output reference', () => {
                // Extract the version bump step
                const lines = releaseConfig.split('\n');
                let inVersionBumpStep = false;
                let versionBumpStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Bump Version and Generate Changelog')) {
                        inVersionBumpStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inVersionBumpStep) {
                        inVersionBumpStep = false;
                    }

                    if (inVersionBumpStep) {
                        versionBumpStepLines.push(line);
                    }
                });

                const versionBumpStepText = versionBumpStepLines.join('\n');
                expect(versionBumpStepText).toContain('id: version');
            });
        });

        // Story 5.4: Commit Version Bump and Push Changes
        describe('Commit Version Bump and Push Changes (Story 5.4)', () => {
            test('workflow should include commit and tag step', () => {
                expect(releaseConfig).toContain('Commit and tag release');
            });

            test('commit step should stage all changes with git add', () => {
                expect(releaseConfig).toContain('git add .');
            });

            test('commit step should check for staged changes before committing', () => {
                expect(releaseConfig).toContain('git diff --staged --quiet');
            });

            test('commit step should handle "no changes to commit" scenario gracefully', () => {
                expect(releaseConfig).toContain('No changes to commit');
            });

            test('commit message should follow format: "chore(release): v{version} [skip ci]"', () => {
                expect(releaseConfig).toContain('chore(release): v');
                expect(releaseConfig).toContain('[skip ci]');
            });

            test('commit message should use extracted version from previous step', () => {
                // Should reference steps.extract_version.outputs.version
                expect(releaseConfig).toContain('steps.extract_version.outputs.version');
            });

            test('commit step should create annotated git tag', () => {
                expect(releaseConfig).toContain('git tag -a');
            });

            test('git tag should follow format: v{version}', () => {
                // Tag should be v + version from extract_version step
                expect(releaseConfig).toContain('v${{ steps.extract_version.outputs.version }}');
            });

            test('git tag should have descriptive message', () => {
                expect(releaseConfig).toContain('Release v${{ steps.extract_version.outputs.version }}');
            });

            test('commit step should run after version extraction', () => {
                const extractVersionIndex = releaseConfig.indexOf('Extract New Version');
                const commitIndex = releaseConfig.indexOf('Commit and tag release');

                expect(extractVersionIndex).toBeGreaterThan(-1);
                expect(commitIndex).toBeGreaterThan(extractVersionIndex);
            });

            test('workflow should include push changes step', () => {
                expect(releaseConfig).toContain('Push changes');
            });

            test('push step should use --follow-tags flag', () => {
                expect(releaseConfig).toContain('git push origin main --follow-tags');
            });

            test('push step should run after commit and tag step', () => {
                const commitIndex = releaseConfig.indexOf('Commit and tag release');
                const pushIndex = releaseConfig.indexOf('Push changes');

                expect(commitIndex).toBeGreaterThan(-1);
                expect(pushIndex).toBeGreaterThan(commitIndex);
            });

            test('commit and push steps should fail workflow on errors (no continue-on-error)', () => {
                // Extract commit step
                const lines = releaseConfig.split('\n');
                let inCommitStep = false;
                let inPushStep = false;
                let commitStepLines = [];
                let pushStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Commit and tag release')) {
                        inCommitStep = true;
                        inPushStep = false;
                    } else if (line.includes('Push changes') && !line.includes('Commit and tag')) {
                        inPushStep = true;
                        inCommitStep = false;
                    } else if (line.match(/^\s{6}- name:/) && (inCommitStep || inPushStep)) {
                        inCommitStep = false;
                        inPushStep = false;
                    }

                    if (inCommitStep) {
                        commitStepLines.push(line);
                    } else if (inPushStep) {
                        pushStepLines.push(line);
                    }
                });

                const commitStepText = commitStepLines.join('\n');
                const pushStepText = pushStepLines.join('\n');

                expect(commitStepText).not.toContain('continue-on-error: true');
                expect(pushStepText).not.toContain('continue-on-error: true');
            });

            test('workflow should have contents write permission for commit/push', () => {
                // Already verified in parent describe, but double check
                expect(releaseConfig).toContain('permissions:');
                expect(releaseConfig).toContain('contents: write');
            });
        });

        // Story 5.5: Create GitHub Release with Changelog
        describe('Create GitHub Release with Changelog (Story 5.5)', () => {
            test('workflow should include GitHub release creation step', () => {
                expect(releaseConfig).toContain('Create GitHub Release');
            });

            test('release step should use actions/github-script@v7', () => {
                expect(releaseConfig).toContain('actions/github-script@v7');
            });

            test('release step should run after tag push', () => {
                const pushIndex = releaseConfig.indexOf('Push changes');
                const releaseIndex = releaseConfig.indexOf('Create GitHub Release');

                expect(pushIndex).toBeGreaterThan(-1);
                expect(releaseIndex).toBeGreaterThan(pushIndex);
            });

            test('release step should read CHANGELOG.md', () => {
                // Script should read CHANGELOG.md file
                expect(releaseConfig).toContain('CHANGELOG.md');
                expect(releaseConfig).toContain('readFileSync');
            });

            test('release step should use github.rest.repos.createRelease API', () => {
                expect(releaseConfig).toContain('github.rest.repos.createRelease');
            });

            test('release should use tag name with v prefix from previous step', () => {
                // Should reference steps.extract_version.outputs.version
                expect(releaseConfig).toContain('tag_name');
                expect(releaseConfig).toContain('v${');
                expect(releaseConfig).toContain('steps.extract_version.outputs.version');
            });

            test('release name should follow format "Release v{version}"', () => {
                expect(releaseConfig).toContain('name:');
                expect(releaseConfig).toContain('Release v${');
            });

            test('release body should contain extracted changelog content', () => {
                expect(releaseConfig).toContain('body:');
            });

            test('release should not be marked as draft', () => {
                expect(releaseConfig).toContain('draft: false');
            });

            test('release should not be marked as prerelease', () => {
                expect(releaseConfig).toContain('prerelease: false');
            });

            test('release step should use context for owner and repo', () => {
                expect(releaseConfig).toContain('context.repo.owner');
                expect(releaseConfig).toContain('context.repo.repo');
            });

            test('release step should have proper error handling', () => {
                // Should not have continue-on-error set to true - failures should fail workflow
                const lines = releaseConfig.split('\n');
                let inReleaseStep = false;
                let releaseStepLines = [];

                lines.forEach((line) => {
                    if (line.includes('Create GitHub Release')) {
                        inReleaseStep = true;
                    } else if (line.match(/^\s{6}- name:/) && inReleaseStep) {
                        inReleaseStep = false;
                    }

                    if (inReleaseStep) {
                        releaseStepLines.push(line);
                    }
                });

                const releaseStepText = releaseStepLines.join('\n');
                expect(releaseStepText).not.toContain('continue-on-error: true');
            });

            test('release step should extract latest version section from changelog', () => {
                // Script should have logic to extract release notes for the specific version
                expect(releaseConfig).toContain('const version');
            });
        });
    });
});
