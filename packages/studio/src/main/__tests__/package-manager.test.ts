/**
 * Tests for package-manager detection.
 *
 * Studio installs a project's dependencies with the manager the project already
 * uses, so it must read that choice off the lockfile rather than guess.
 */

import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    detectPackageManager,
    packageManagerFromLockfiles,
} from '../package-manager';

describe('packageManagerFromLockfiles', () => {
    it('picks yarn for a yarn.lock', () => {
        expect(packageManagerFromLockfiles(['package.json', 'yarn.lock'])).toBe(
            'yarn'
        );
    });

    it('picks pnpm for a pnpm-lock.yaml', () => {
        expect(
            packageManagerFromLockfiles(['package.json', 'pnpm-lock.yaml'])
        ).toBe('pnpm');
    });

    it('picks npm for a package-lock.json', () => {
        expect(
            packageManagerFromLockfiles(['package.json', 'package-lock.json'])
        ).toBe('npm');
    });

    it('defaults to npm when no lockfile is present', () => {
        expect(packageManagerFromLockfiles(['package.json'])).toBe('npm');
    });

    it('prefers yarn over pnpm when both lockfiles are present', () => {
        expect(
            packageManagerFromLockfiles(['yarn.lock', 'pnpm-lock.yaml'])
        ).toBe('yarn');
    });
});

describe('detectPackageManager', () => {
    const tempDirs: string[] = [];

    afterEach(async () => {
        while (tempDirs.length > 0) {
            await rm(tempDirs.pop()!, { recursive: true, force: true });
        }
    });

    it('reads the lockfile in a real directory', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-pm-'));
        tempDirs.push(dir);
        await writeFile(join(dir, 'yarn.lock'), '');
        expect(await detectPackageManager(dir)).toBe('yarn');
    });

    it('defaults to npm for a directory that does not exist', async () => {
        expect(
            await detectPackageManager(join(tmpdir(), 'doodle-pm-missing-xyz'))
        ).toBe('npm');
    });
});
