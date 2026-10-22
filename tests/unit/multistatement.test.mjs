import { describe, expect, it } from 'vitest'
import { splitStatements } from '../../src/client/multistatement.ts'

describe('splitStatements', () => {
  it('splits on top-level semicolons and drops empty trailing parts', () => {
    expect(splitStatements('select 1; select 2;\n')).toEqual(['select 1', 'select 2'])
  })

  it('keeps semicolons inside strings, quoted identifiers and escapes', () => {
    expect(splitStatements("select 'a;b', \"c;d\"; select `x;y`;")).toEqual([
      "select 'a;b', \"c;d\"",
      'select `x;y`',
    ])
    expect(splitStatements("select 'it''s; fine'; select 2")).toEqual(["select 'it''s; fine'", 'select 2'])
    expect(splitStatements("select 'back\\\\'; select 2")).toEqual(["select 'back\\\\'", 'select 2'])
  })

  it('ignores semicolons in line and block comments', () => {
    expect(splitStatements('select 1 -- one; two\n; select 2')).toEqual(['select 1 -- one; two', 'select 2'])
    expect(splitStatements('select 1 # hash; comment\n; select 2')).toEqual(['select 1 # hash; comment', 'select 2'])
    expect(splitStatements('/* a; b */ select 1; /* c; d */')).toEqual(['/* a; b */ select 1', '/* c; d */'])
  })

  it('returns an empty list for blank scripts and keeps single statements intact', () => {
    expect(splitStatements('   \n\t ')).toEqual([])
    expect(splitStatements('select 1')).toEqual(['select 1'])
  })
})
