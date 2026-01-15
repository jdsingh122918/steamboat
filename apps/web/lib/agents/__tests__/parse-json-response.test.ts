import { describe, it, expect } from 'vitest';
import { parseJsonResponse } from '../parse-json-response';

describe('parseJsonResponse', () => {
  it('should parse valid JSON string', () => {
    const json = '{"name": "test", "value": 123}';
    const result = parseJsonResponse<{ name: string; value: number }>(json);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('test');
    expect(result?.value).toBe(123);
  });

  it('should parse JSON with whitespace', () => {
    const json = '  {"name": "test"}  ';
    const result = parseJsonResponse<{ name: string }>(json);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('test');
  });

  it('should extract JSON from markdown code block', () => {
    const response = '```json\n{"vendor": "Store", "amount": 50}\n```';
    const result = parseJsonResponse<{ vendor: string; amount: number }>(response);

    expect(result).not.toBeNull();
    expect(result?.vendor).toBe('Store');
    expect(result?.amount).toBe(50);
  });

  it('should extract JSON from code block without json label', () => {
    const response = '```\n{"vendor": "Shop"}\n```';
    const result = parseJsonResponse<{ vendor: string }>(response);

    expect(result).not.toBeNull();
    expect(result?.vendor).toBe('Shop');
  });

  it('should extract JSON embedded in text', () => {
    const response = 'Here is the data:\n{"name": "result", "count": 5}\nEnd of response.';
    const result = parseJsonResponse<{ name: string; count: number }>(response);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('result');
    expect(result?.count).toBe(5);
  });

  it('should handle nested JSON objects', () => {
    const json = '{"outer": {"inner": "value"}, "array": [1, 2, 3]}';
    const result = parseJsonResponse<{
      outer: { inner: string };
      array: number[];
    }>(json);

    expect(result).not.toBeNull();
    expect(result?.outer.inner).toBe('value');
    expect(result?.array).toEqual([1, 2, 3]);
  });

  it('should return null for invalid JSON', () => {
    const invalid = 'not valid json';
    const result = parseJsonResponse(invalid);

    expect(result).toBeNull();
  });

  it('should return null for malformed JSON', () => {
    const malformed = '{"name": "test"';
    const result = parseJsonResponse(malformed);

    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseJsonResponse('');

    expect(result).toBeNull();
  });

  it('should handle JSON with special characters', () => {
    const json = '{"message": "Hello\\nWorld", "path": "C:\\\\Users"}';
    const result = parseJsonResponse<{ message: string; path: string }>(json);

    expect(result).not.toBeNull();
    expect(result?.message).toBe('Hello\nWorld');
    expect(result?.path).toBe('C:\\Users');
  });

  it('should handle complex AI response with preamble', () => {
    const response = `Based on my analysis, here is the expense data:

\`\`\`json
{
  "vendor": "Coffee Shop",
  "amount": 15.50,
  "date": "2024-03-15",
  "currency": "USD"
}
\`\`\`

I extracted this from the receipt image.`;

    const result = parseJsonResponse<{
      vendor: string;
      amount: number;
      date: string;
      currency: string;
    }>(response);

    expect(result).not.toBeNull();
    expect(result?.vendor).toBe('Coffee Shop');
    expect(result?.amount).toBe(15.5);
    expect(result?.date).toBe('2024-03-15');
    expect(result?.currency).toBe('USD');
  });

  it('should prioritize code block over embedded JSON', () => {
    const response = 'Previous: {"old": true}\n```json\n{"new": true}\n```';
    const result = parseJsonResponse<{ new?: boolean; old?: boolean }>(response);

    expect(result).not.toBeNull();
    expect(result?.new).toBe(true);
    expect(result?.old).toBeUndefined();
  });
});
