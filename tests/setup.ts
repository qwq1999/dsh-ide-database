/**
 * jsdom tests wait on async state (schema list, query results). The files run in
 * parallel workers, so the default one-second async timeout flakes on a busy
 * machine; give every `findBy*` / `waitFor` the same room the suite already
 * allows a whole test.
 */
import { configure } from '@testing-library/react'

configure({ asyncUtilTimeout: 4000 })
