package dshdb;

/** Raised when {@link SqlExecutor#cancel(String)} cancelled the running statement. */
final class QueryCancelled extends RuntimeException {
    QueryCancelled(String message) {
        super(message);
    }
}
