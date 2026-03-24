const { processQuestion, askGemini, stripCodeFences } = require('./geni');

describe('geni-tests', () => {
  test('removes triple backticks', () => {
    const input = '```bash\ngit status\n```';
    const expected = 'bash\ngit status';
    expect(stripCodeFences(input)).toBe(expected);
  });

  test('works with no backticks', () => {
    expect(stripCodeFences('git status')).toBe('git status');
  });

  // write unittest for processQuestion function
  test('processQuestion formats question correctly', async () => {
    const args = ['"how to delete a git branch?"'];
    const expected = 'git branch -d <branch_name>';
    // Mock askGemini to return the processed question for testing
    const mockanswer = await processQuestion(args);
    console.log('Mock answer:', mockanswer);
    expect(mockanswer).toContain(expected);

});

/*describe('promptTemplate', () => {
  test('formats the prompt correctly', () => {
    const q = 'how to delete a git branch';
    const result = promptTemplate(q);
    expect(result).toMatch(/Respond with only the terminal command/);
    expect(result).toContain(q);
  });
});*/

});
