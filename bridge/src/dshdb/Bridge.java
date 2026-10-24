package dshdb;

import java.io.BufferedReader;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * JSON-lines bridge between the DSH plugin host and JDBC drivers.
 *
 * The JVM is started once per plugin process. Requests are executed on worker
 * threads so a long-running query never blocks a cancel request. Driver jars
 * are loaded per connection with an isolated URLClassLoader.
 */
public final class Bridge {
    private Bridge() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && "--self-test".equals(args[0])) {
            Map<String, Object> out = new LinkedHashMap<String, Object>();
            out.put("ok", Boolean.TRUE);
            out.put("bridge", Integer.valueOf(1));
            out.put("java", System.getProperty("java.version"));
            out.put("vm", System.getProperty("java.vm.name"));
            System.out.println(Json.stringify(out));
            return;
        }

        final PrintStream protocolOut =
                new PrintStream(new FileOutputStream(FileDescriptor.out), true, "UTF-8");
        // JDBC drivers occasionally log to System.out; that must never corrupt
        // the one-JSON-object-per-line protocol.
        System.setOut(System.err);
        final Object writeLock = new Object();
        final SqlExecutor executor = new SqlExecutor();
        final ExecutorService workers = Executors.newCachedThreadPool(runnable -> {
            Thread thread = new Thread(runnable, "dshdb-request");
            thread.setDaemon(true);
            return thread;
        });
        BufferedReader reader =
                new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String line;
        while ((line = reader.readLine()) != null) {
            final String request = line.trim();
            if (request.isEmpty()) {
                continue;
            }
            workers.submit(() -> handle(request, executor, protocolOut, writeLock));
        }
        workers.shutdownNow();
        executor.closeAll();
    }

    private static void handle(
            String request, SqlExecutor executor, PrintStream out, Object writeLock) {
        String id = "";
        try {
            Map<String, Object> envelope = Json.asObject(Json.parse(request));
            id = Json.string(envelope.get("id"), "");
            String method = Json.string(envelope.get("method"), "");
            Map<String, Object> params = new LinkedHashMap<String, Object>();
            Object rawParams = envelope.get("params");
            if (rawParams instanceof Map) {
                params = Json.asObject(rawParams);
            }
            Object data = dispatch(method, params, executor);
            Map<String, Object> response = new LinkedHashMap<String, Object>();
            response.put("id", id);
            response.put("ok", Boolean.TRUE);
            response.put("data", data);
            send(response, out, writeLock);
        } catch (Throwable error) {
            Map<String, Object> response = new LinkedHashMap<String, Object>();
            response.put("id", id);
            response.put("ok", Boolean.FALSE);
            Map<String, Object> body = new LinkedHashMap<String, Object>();
            body.put("code", codeOf(error));
            body.put("message", messageOf(error));
            String detail = detailOf(error);
            if (detail != null) {
                body.put("detail", detail);
            }
            response.put("error", body);
            send(response, out, writeLock);
        }
    }

    private static void send(Map<String, Object> response, PrintStream out, Object writeLock) {
        String json = Json.stringify(response);
        synchronized (writeLock) {
            out.println(json);
            out.flush();
        }
    }

    private static Object dispatch(String method, Map<String, Object> params, SqlExecutor executor)
            throws Exception {
        if ("ping".equals(method)) {
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("bridge", Integer.valueOf(1));
            data.put("java", System.getProperty("java.version"));
            data.put("vm", System.getProperty("java.vm.name"));
            data.put("threads", Integer.valueOf(Thread.activeCount()));
            return data;
        }
        if ("connect".equals(method)) {
            return executor.connect(params);
        }
        if ("disconnect".equals(method)) {
            executor.disconnect(Json.string(params.get("connId"), ""));
            return ok();
        }
        if ("setSchema".equals(method)) {
            executor.setSchema(
                    Json.string(params.get("connId"), ""), Json.string(params.get("schema"), ""));
            return ok();
        }
        if ("schemas".equals(method)) {
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put(
                    "schemas",
                    executor.schemas(
                            Json.string(params.get("connId"), ""),
                            Json.string(params.get("filter"), "")));
            return data;
        }
        if ("objects".equals(method)) {
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put(
                    "objects",
                    executor.objects(
                            Json.string(params.get("connId"), ""),
                            Json.string(params.get("schema"), "")));
            return data;
        }
        if ("columns".equals(method)) {
            return executor.columns(
                    Json.string(params.get("connId"), ""),
                    Json.string(params.get("schema"), ""),
                    Json.string(params.get("table"), ""));
        }
        if ("query".equals(method)) {
            return executor.query(params);
        }
        if ("explain".equals(method)) {
            return executor.explain(params);
        }
        if ("tx".equals(method)) {
            return executor.transaction(params);
        }
        if ("cancel".equals(method)) {
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put(
                    "cancelled",
                    Boolean.valueOf(executor.cancel(Json.string(params.get("stmtKey"), ""))));
            return data;
        }
        if ("closeAll".equals(method)) {
            executor.closeAll();
            return ok();
        }
        throw new IllegalArgumentException("unknown bridge method: " + method);
    }

    private static Map<String, Object> ok() {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("ok", Boolean.TRUE);
        return data;
    }

    private static String codeOf(Throwable error) {
        if (error instanceof QueryCancelled) {
            return "cancelled";
        }
        if (error instanceof UnsupportedClassVersionError) {
            return "java-version";
        }
        if (error instanceof ClassNotFoundException || error instanceof NoClassDefFoundError) {
            return "driver-load";
        }
        if (error instanceof java.sql.SQLTimeoutException) {
            return "timeout";
        }
        if (error instanceof java.sql.SQLException) {
            return "sql";
        }
        if (error instanceof IllegalArgumentException) {
            return "bad-request";
        }
        return "bridge";
    }

    private static String messageOf(Throwable error) {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            message = error.getClass().getSimpleName();
        }
        return message;
    }

    private static String detailOf(Throwable error) {
        StackTraceElement[] stack = error.getStackTrace();
        if (stack.length == 0) {
            return null;
        }
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < Math.min(8, stack.length); i++) {
            if (i > 0) {
                out.append('\n');
            }
            out.append(stack[i].toString());
        }
        return out.toString();
    }
}
