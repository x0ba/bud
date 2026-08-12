import { useQueries } from 'convex/react'
import type {
  PaginatedQueryArgs,
  PaginatedQueryReference,
  RequestForQueries,
  UsePaginatedQueryReturnType,
} from 'convex/react'
import { getFunctionName } from 'convex/server'
import type { FunctionReturnType } from 'convex/server'
import type { Value } from 'convex/values'
import { useState } from 'react'

type PageResult<TQuery extends PaginatedQueryReference> =
  FunctionReturnType<TQuery>

type Continuation = { cursor: string; numItems: number }

type HookState<TQuery extends PaginatedQueryReference> = {
  filtersKey: string
  filterArgs: Record<string, Value>
  numItems: number
  query: TQuery
  // `api.foo.bar` is a proxy that mints a new reference per access, so query
  // changes must be detected by name, never by identity.
  queryName: string
  pages: Continuation[]
  requests: RequestForQueries
}

function omitUndefined(
  args: Record<string, unknown>,
): Record<string, Value> {
  const out: Record<string, Value> = {}
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) out[key] = value as Value
  }
  return out
}

function buildRequests<TQuery extends PaginatedQueryReference>(
  query: TQuery,
  filterArgs: Record<string, Value>,
  numItems: number,
  pages: Continuation[],
): RequestForQueries {
  const requests: RequestForQueries = {
    '0': {
      query,
      args: {
        ...filterArgs,
        paginationOpts: { numItems, cursor: null },
      },
    },
  }
  for (const [index, page] of pages.entries()) {
    requests[String(index + 1)] = {
      query,
      args: {
        ...filterArgs,
        paginationOpts: {
          numItems: page.numItems,
          cursor: page.cursor,
        },
      },
    }
  }
  return requests
}

/** Args for page 0 — must match loader `prewarmQuery` exactly for a cache hit. */
export function firstPageArgs<TQuery extends PaginatedQueryReference>(
  filters: PaginatedQueryArgs<TQuery>,
  numItems: number,
): TQuery['_args'] {
  return {
    ...omitUndefined(filters),
    paginationOpts: { numItems, cursor: null },
  }
}

/**
 * Page 0 omits `paginationOpts.id` so it shares a cache entry with
 * `prewarmQuery(firstPageArgs(...))`. Further pages are a plain cursor chain.
 *
 * `requests` is kept in state so its identity is stable across renders —
 * `useQueries` setStates whenever the requests object identity changes.
 */
export function usePagedQuery<TQuery extends PaginatedQueryReference>(
  query: TQuery,
  filters: PaginatedQueryArgs<TQuery>,
  options: { initialNumItems: number },
): UsePaginatedQueryReturnType<TQuery> {
  const numItems = options.initialNumItems
  const filterArgs = omitUndefined(filters)
  const filtersKey = JSON.stringify(filterArgs)
  const queryName = getFunctionName(query)

  const createState = (): HookState<TQuery> => ({
    filtersKey,
    filterArgs,
    numItems,
    query,
    queryName,
    pages: [],
    requests: buildRequests(query, filterArgs, numItems, []),
  })

  const [state, setState] = useState(createState)

  // Reset when filters/page size/query change. Same render-time sync pattern
  // as Convex's usePaginatedQuery — keeps `requests` referentially stable.
  let curr = state
  if (
    state.filtersKey !== filtersKey ||
    state.numItems !== numItems ||
    state.queryName !== queryName
  ) {
    curr = createState()
    setState(curr)
  }

  const resultsObject = useQueries(curr.requests)
  const first = resultsObject['0']

  if (first === undefined) {
    return {
      results: [],
      status: 'LoadingFirstPage',
      isLoading: true,
      loadMore: () => {},
    }
  }
  if (first instanceof Error) throw first

  const loaded: PageResult<TQuery>[] = [first as PageResult<TQuery>]
  for (let i = 0; i < curr.pages.length; i++) {
    const result = resultsObject[String(i + 1)]
    if (result === undefined) {
      return {
        results: flatPages(loaded),
        status: 'LoadingMore',
        isLoading: true,
        loadMore: () => {},
      }
    }
    if (result instanceof Error) {
      if (result.message.includes('InvalidCursor')) {
        const reset = createState()
        setState(reset)
        return {
          results: flatPages([first as PageResult<TQuery>]),
          status: 'LoadingFirstPage',
          isLoading: true,
          loadMore: () => {},
        }
      }
      throw result
    }
    loaded.push(result as PageResult<TQuery>)
  }

  const results = flatPages(loaded)
  const last = loaded.at(-1)!

  if (last.isDone) {
    return {
      results,
      status: 'Exhausted',
      isLoading: false,
      loadMore: () => {},
    }
  }

  const continueCursor = last.continueCursor
  let alreadyLoadingMore = false
  return {
    results,
    status: 'CanLoadMore',
    isLoading: false,
    loadMore: (nextNumItems: number) => {
      if (alreadyLoadingMore) return
      alreadyLoadingMore = true
      setState((prev) => {
        if (
          prev.filtersKey !== filtersKey ||
          prev.pages.some((p) => p.cursor === continueCursor)
        ) {
          return prev
        }
        const pages = [
          ...prev.pages,
          { cursor: continueCursor, numItems: nextNumItems },
        ]
        return {
          ...prev,
          pages,
          requests: buildRequests(
            prev.query,
            prev.filterArgs,
            prev.numItems,
            pages,
          ),
        }
      })
    },
  }
}

function flatPages<TQuery extends PaginatedQueryReference>(
  pages: PageResult<TQuery>[],
): UsePaginatedQueryReturnType<TQuery>['results'] {
  return pages.flatMap(
    (page) => page.page,
  ) as UsePaginatedQueryReturnType<TQuery>['results']
}
