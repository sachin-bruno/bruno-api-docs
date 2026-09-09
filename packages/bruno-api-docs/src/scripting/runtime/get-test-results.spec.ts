import { describe, it, expect } from 'vitest';
import ScriptRuntime from '@/scripting/runtime/script-runtime';

const runTests = async (script: string) => {
  const runtimeVariables: Record<string, unknown> = {};
  const bru = await new ScriptRuntime().runScript({ script, variables: { runtimeVariables } });
  return { runtimeVariables, results: await bru.getTestResults!() };
};

describe('bru.getTestResults inside a tests script', () => {
  it('sees the tests that already finished earlier in the same run', async () => {
    const { runtimeVariables } = await runTests(`
      test("first", function () {
        expect(true).to.equal(true);
      });
      test("second", function () {
        expect(true).to.equal(true);
      });
      test("third", function () {
        expect(true).to.equal(true);
      });
      test("reads the results so far", async function () {
        const seen = await bru.getTestResults();
        bru.setVar("seenTotal", seen.summary.total);
        bru.setVar("seenPassed", seen.summary.passed);
        bru.setVar("seenCount", seen.results.length);
        bru.setVar("seenNames", seen.results.map((r) => r.description).join(","));
      });
    `);

    expect(runtimeVariables.seenCount).toBe(3);
    expect(runtimeVariables.seenTotal).toBe(3);
    expect(runtimeVariables.seenPassed).toBe(3);
    expect(runtimeVariables.seenNames).toBe('first,second,third');
  });

  it('reports a failure that happened earlier in the run', async () => {
    const { runtimeVariables } = await runTests(`
      test("passing one", function () {
        expect(1).to.equal(1);
      });
      test("failing one", function () {
        expect(1).to.equal(2);
      });
      test("reads the results so far", async function () {
        const seen = await bru.getTestResults();
        bru.setVar("seenTotal", seen.summary.total);
        bru.setVar("seenPassed", seen.summary.passed);
        bru.setVar("seenFailed", seen.summary.failed);
      });
    `);

    expect(runtimeVariables.seenTotal).toBe(2);
    expect(runtimeVariables.seenPassed).toBe(1);
    expect(runtimeVariables.seenFailed).toBe(1);
  });

  it('still returns every test to the caller once the whole script has run', async () => {
    const { results } = await runTests(`
      test("first", function () {
        expect(true).to.equal(true);
      });
      test("second", async function () {
        const seen = await bru.getTestResults();
        bru.setVar("seenCount", seen.results.length);
      });
    `);

    expect(results.summary.total).toBe(2);
    expect(results.summary.passed).toBe(2);
    expect(results.results.map((r) => r.description)).toEqual(['first', 'second']);
  });

  it('sees every finished test, however many there are', async () => {
    const many = Array.from(
      { length: 12 },
      (_, i) => `test("t${i}", function () { expect(true).to.equal(true); });`
    ).join('\n');

    const { runtimeVariables } = await runTests(`
      ${many}
      test("reads the results so far", async function () {
        const seen = await bru.getTestResults();
        bru.setVar("seenCount", seen.results.length);
      });
    `);

    expect(runtimeVariables.seenCount).toBe(12);
  });

  it('sees tests that were awaited one after another', async () => {
    const { runtimeVariables } = await runTests(`
      await test("first", function () {
        expect(true).to.equal(true);
      });
      await test("second", function () {
        expect(true).to.equal(true);
      });
      const seen = await bru.getTestResults();
      bru.setVar("seenCount", seen.results.length);
    `);

    expect(runtimeVariables.seenCount).toBe(2);
  });

  it('leaves out a test that is still waiting, since it has not finished yet', async () => {
    const { runtimeVariables } = await runTests(`
      test("still sleeping", async function () {
        await bru.sleep(10);
        expect(true).to.equal(true);
      });
      test("reads the results so far", async function () {
        const seen = await bru.getTestResults();
        bru.setVar("seenCount", seen.results.length);
      });
    `);

    expect(runtimeVariables.seenCount).toBe(0);
  });

  it('returns an empty set when nothing has run yet', async () => {
    const { runtimeVariables } = await runTests(`
      test("reads the results before anything else finished", async function () {
        const seen = await bru.getTestResults();
        bru.setVar("seenTotal", seen.summary.total);
        bru.setVar("seenCount", seen.results.length);
      });
    `);

    expect(runtimeVariables.seenTotal).toBe(0);
    expect(runtimeVariables.seenCount).toBe(0);
  });
});
