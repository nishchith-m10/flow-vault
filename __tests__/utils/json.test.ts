import { describe, it, expect } from 'vitest';
import { safeJSONParse, safeJSONStringify } from '@/lib/utils/json';

describe('safeJSONParse', () => {
  describe('Valid JSON', () => {
    it('should parse valid JSON string', () => {
      const result = safeJSONParse('{"key":"value"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
      expect(result.error).toBeUndefined();
    });

    it('should parse valid JSON array', () => {
      const result = safeJSONParse('[1, 2, 3]');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should parse JSON with nested objects', () => {
      const json = '{"outer":{"inner":"value"}}';
      const result = safeJSONParse(json);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ outer: { inner: 'value' } });
    });

    it('should parse empty object', () => {
      const result = safeJSONParse('{}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should parse empty array', () => {
      const result = safeJSONParse('[]');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should parse null value', () => {
      const result = safeJSONParse('null');
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should parse boolean values', () => {
      const resultTrue = safeJSONParse('true');
      expect(resultTrue.success).toBe(true);
      expect(resultTrue.data).toBe(true);

      const resultFalse = safeJSONParse('false');
      expect(resultFalse.success).toBe(true);
      expect(resultFalse.data).toBe(false);
    });

    it('should parse number values', () => {
      const result = safeJSONParse('123.456');
      expect(result.success).toBe(true);
      expect(result.data).toBe(123.456);
    });

    it('should parse string values', () => {
      const result = safeJSONParse('"hello world"');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello world');
    });

    it('should parse complex nested structures', () => {
      const json = JSON.stringify({
        users: [
          { id: 1, name: 'Alice', active: true },
          { id: 2, name: 'Bob', active: false }
        ],
        metadata: {
          count: 2,
          timestamp: '2026-01-13T00:00:00Z'
        }
      });
      const result = safeJSONParse(json);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('metadata');
    });
  });

  describe('Invalid JSON', () => {
    it('should handle malformed JSON', () => {
      const result = safeJSONParse('{invalid json}');
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toContain('JSON parse error');
    });

    it('should handle truncated JSON object', () => {
      const result = safeJSONParse('{"key":"value"');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle truncated JSON array', () => {
      const result = safeJSONParse('[1, 2, 3');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid characters', () => {
      const result = safeJSONParse('{"key": undefined}');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty string', () => {
      const result = safeJSONParse('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle whitespace only', () => {
      const result = safeJSONParse('   ');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle single quote JSON (invalid)', () => {
      const result = safeJSONParse("{'key':'value'}");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle trailing commas', () => {
      const result = safeJSONParse('{"key":"value",}');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unquoted keys', () => {
      const result = safeJSONParse('{key:"value"}');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Fallback Values', () => {
    it('should return fallback on parse error', () => {
      const fallback = { default: true };
      const result = safeJSONParse('{invalid}', fallback);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallback);
      expect(result.error).toBeDefined();
    });

    it('should not use fallback on successful parse', () => {
      const fallback = { default: true };
      const result = safeJSONParse('{"key":"value"}', fallback);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
      expect(result.data).not.toEqual(fallback);
    });

    it('should handle null as fallback', () => {
      const result = safeJSONParse('{invalid}', null);
      expect(result.success).toBe(false);
      expect(result.data).toBe(null);
    });

    it('should handle array as fallback', () => {
      const fallback = ['default'];
      const result = safeJSONParse('{invalid}', fallback);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallback);
    });

    it('should handle primitive as fallback', () => {
      const result = safeJSONParse('{invalid}', 'fallback string');
      expect(result.success).toBe(false);
      expect(result.data).toBe('fallback string');
    });
  });

  describe('Type Safety', () => {
    it('should preserve type with generic', () => {
      interface TestType {
        id: string;
        name: string;
      }
      const json = '{"id":"123","name":"test"}';
      const result = safeJSONParse<TestType>(json);
      
      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.id).toBe('123');
        expect(result.data.name).toBe('test');
      }
    });

    it('should work with array types', () => {
      interface Item {
        value: number;
      }
      const json = '[{"value":1},{"value":2}]';
      const result = safeJSONParse<Item[]>(json);
      
      expect(result.success).toBe(true);
      if (result.data) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toHaveLength(2);
      }
    });

    it('should work with complex nested types', () => {
      interface NestedType {
        outer: {
          inner: {
            value: number;
          };
        };
      }
      const json = '{"outer":{"inner":{"value":42}}}';
      const result = safeJSONParse<NestedType>(json);
      
      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.outer.inner.value).toBe(42);
      }
    });
  });
});

describe('safeJSONStringify', () => {
  describe('Valid Data', () => {
    it('should stringify object', () => {
      const result = safeJSONStringify({ key: 'value' });
      expect(result.success).toBe(true);
      expect(result.json).toBe('{"key":"value"}');
      expect(result.error).toBeUndefined();
    });

    it('should stringify array', () => {
      const result = safeJSONStringify([1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.json).toBe('[1,2,3]');
    });

    it('should stringify with spacing', () => {
      const result = safeJSONStringify({ key: 'value' }, 2);
      expect(result.success).toBe(true);
      expect(result.json).toContain('\n');
      expect(result.json).toContain('  ');
      expect(result.json).toContain('"key": "value"');
    });

    it('should stringify primitives', () => {
      expect(safeJSONStringify('test').json).toBe('"test"');
      expect(safeJSONStringify(123).json).toBe('123');
      expect(safeJSONStringify(true).json).toBe('true');
      expect(safeJSONStringify(null).json).toBe('null');
    });

    it('should stringify nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      };
      const result = safeJSONStringify(data);
      expect(result.success).toBe(true);
      expect(result.json).toContain('"level3":"deep value"');
    });

    it('should stringify arrays with objects', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      const result = safeJSONStringify(data);
      expect(result.success).toBe(true);
      expect(result.json).toContain('"name":"Alice"');
      expect(result.json).toContain('"name":"Bob"');
    });

    it('should handle empty object', () => {
      const result = safeJSONStringify({});
      expect(result.success).toBe(true);
      expect(result.json).toBe('{}');
    });

    it('should handle empty array', () => {
      const result = safeJSONStringify([]);
      expect(result.success).toBe(true);
      expect(result.json).toBe('[]');
    });

    it('should handle special characters in strings', () => {
      const data = { text: 'Line 1\nLine 2\tTabbed' };
      const result = safeJSONStringify(data);
      expect(result.success).toBe(true);
      expect(result.json).toContain('\\n');
      expect(result.json).toContain('\\t');
    });

    it('should handle unicode characters', () => {
      const data = { emoji: '🚀', chinese: '你好' };
      const result = safeJSONStringify(data);
      expect(result.success).toBe(true);
      expect(result.json).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      
      const result = safeJSONStringify(circular);
      expect(result.success).toBe(false);
      expect(result.json).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('circular');
    });

    it('should handle BigInt (not JSON serializable)', () => {
      const result = safeJSONStringify({ big: BigInt(123) });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Symbol (silently omitted by JSON.stringify)', () => {
      const result = safeJSONStringify({ sym: Symbol('test') });
      expect(result.success).toBe(true);
      expect(result.json).toBe('{}'); // Symbols are omitted
    });

    it('should handle functions (silently omitted by JSON.stringify)', () => {
      const result = safeJSONStringify({ func: () => {} });
      expect(result.success).toBe(true);
      expect(result.json).toBe('{}'); // Functions are omitted
    });

    it('should handle undefined values in objects (omitted)', () => {
      const result = safeJSONStringify({ key: undefined });
      expect(result.success).toBe(true);
      expect(result.json).toBe('{}'); // undefined values are omitted
    });

    it('should handle undefined values in arrays (becomes null)', () => {
      const result = safeJSONStringify([1, undefined, 3]);
      expect(result.success).toBe(true);
      expect(result.json).toBe('[1,null,3]');
    });
  });

  describe('Spacing Options', () => {
    it('should format with 2 spaces', () => {
      const result = safeJSONStringify({ a: 1, b: 2 }, 2);
      expect(result.success).toBe(true);
      expect(result.json).toContain('  "a": 1');
    });

    it('should format with 4 spaces', () => {
      const result = safeJSONStringify({ a: 1 }, 4);
      expect(result.success).toBe(true);
      expect(result.json).toContain('    "a": 1');
    });

    it('should handle no spacing (compact)', () => {
      const result = safeJSONStringify({ a: 1, b: 2 });
      expect(result.success).toBe(true);
      expect(result.json).toBe('{"a":1,"b":2}');
      expect(result.json).not.toContain('\n');
    });
  });
});

describe('Integration: Parse and Stringify', () => {
  it('should round-trip data successfully', () => {
    const original = { id: '123', nested: { value: 42 } };
    
    const stringifyResult = safeJSONStringify(original);
    expect(stringifyResult.success).toBe(true);
    
    const parseResult = safeJSONParse(stringifyResult.json!);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data).toEqual(original);
  });

  it('should round-trip arrays', () => {
    const original = [1, 'two', { three: 3 }, [4, 5]];
    
    const stringifyResult = safeJSONStringify(original);
    expect(stringifyResult.success).toBe(true);
    
    const parseResult = safeJSONParse(stringifyResult.json!);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data).toEqual(original);
  });

  it('should round-trip with formatting', () => {
    const original = { a: 1, b: { c: 2 } };
    
    const stringifyResult = safeJSONStringify(original, 2);
    expect(stringifyResult.success).toBe(true);
    expect(stringifyResult.json).toContain('\n');
    
    const parseResult = safeJSONParse(stringifyResult.json!);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data).toEqual(original);
  });

  it('should handle complex real-world data', () => {
    const original = {
      workflow: {
        id: 'wf-123',
        name: 'Production Workflow',
        nodes: [
          { id: 'node1', type: 'trigger', parameters: { event: 'webhook' } },
          { id: 'node2', type: 'function', parameters: { code: 'return item;' } }
        ],
        connections: {
          node1: { main: [[{ node: 'node2', type: 'main', index: 0 }]] }
        },
        active: true,
        tags: ['production', 'automated']
      }
    };
    
    const stringifyResult = safeJSONStringify(original);
    expect(stringifyResult.success).toBe(true);
    
    const parseResult = safeJSONParse(stringifyResult.json!);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data).toEqual(original);
  });
});
