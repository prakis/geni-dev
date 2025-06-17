const { stripCodeFences, promptTemplate } = require('./geni');

describe('stripCodeFences', () => {
  test('removes triple backticks', () => {
    const input = '```bash\ngit status\n```';
    const expected = 'bash\ngit status';
    expect(stripCodeFences(input)).toBe(expected);
  });

  test('works with no backticks', () => {
    expect(stripCodeFences('git status')).toBe('git status');
  });
});

/*describe('promptTemplate', () => {
  test('formats the prompt correctly', () => {
    const q = 'how to delete a git branch';
    const result = promptTemplate(q);
    expect(result).toMatch(/Respond with only the terminal command/);
    expect(result).toContain(q);
  });
});*/
