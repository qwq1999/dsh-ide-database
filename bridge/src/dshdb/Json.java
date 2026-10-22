package dshdb;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal dependency-free JSON reader/writer. The bridge protocol is one JSON
 * object per line; keeping this in-tree avoids shipping a JSON dependency next
 * to the driver jars.
 */
public final class Json {
    private Json() {
    }

    public static Object parse(String text) {
        Parser parser = new Parser(text);
        Object value = parser.value();
        parser.skipWhitespace();
        if (!parser.atEnd()) {
            throw new IllegalArgumentException("trailing characters at offset " + parser.position());
        }
        return value;
    }

    public static String stringify(Object value) {
        StringBuilder builder = new StringBuilder(256);
        write(builder, value);
        return builder.toString();
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> asObject(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        throw new IllegalArgumentException("expected JSON object");
    }

    public static List<Object> asArray(Object value) {
        if (value instanceof List) {
            @SuppressWarnings("unchecked")
            List<Object> list = (List<Object>) value;
            return list;
        }
        throw new IllegalArgumentException("expected JSON array");
    }

    public static String string(Object value, String fallback) {
        return value instanceof String ? (String) value : fallback;
    }

    public static long integer(Object value, long fallback) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return fallback;
    }

    public static boolean bool(Object value, boolean fallback) {
        return value instanceof Boolean ? (Boolean) value : fallback;
    }

    private static void write(StringBuilder out, Object value) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof String) {
            writeString(out, (String) value);
        } else if (value instanceof Boolean) {
            out.append(value.toString());
        } else if (value instanceof Number) {
            Number number = (Number) value;
            if (number instanceof Double || number instanceof Float) {
                double d = number.doubleValue();
                if (Double.isNaN(d) || Double.isInfinite(d)) {
                    writeString(out, Double.toString(d));
                } else {
                    out.append(number.toString());
                }
            } else {
                out.append(number.toString());
            }
        } else if (value instanceof Map) {
            out.append('{');
            boolean first = true;
            for (Object entryObject : ((Map<?, ?>) value).entrySet()) {
                Map.Entry<?, ?> entry = (Map.Entry<?, ?>) entryObject;
                if (!first) {
                    out.append(',');
                }
                first = false;
                writeString(out, String.valueOf(entry.getKey()));
                out.append(':');
                write(out, entry.getValue());
            }
            out.append('}');
        } else if (value instanceof Iterable) {
            out.append('[');
            boolean first = true;
            for (Object item : (Iterable<?>) value) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                write(out, item);
            }
            out.append(']');
        } else if (value.getClass().isArray()) {
            out.append('[');
            int length = java.lang.reflect.Array.getLength(value);
            for (int i = 0; i < length; i++) {
                if (i > 0) {
                    out.append(',');
                }
                write(out, java.lang.reflect.Array.get(value, i));
            }
            out.append(']');
        } else {
            writeString(out, String.valueOf(value));
        }
    }

    private static void writeString(StringBuilder out, String text) {
        out.append('"');
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '"':
                    out.append("\\\"");
                    break;
                case '\\':
                    out.append("\\\\");
                    break;
                case '\n':
                    out.append("\\n");
                    break;
                case '\r':
                    out.append("\\r");
                    break;
                case '\t':
                    out.append("\\t");
                    break;
                case '\b':
                    out.append("\\b");
                    break;
                case '\f':
                    out.append("\\f");
                    break;
                default:
                    if (c < 0x20) {
                        String hex = Integer.toHexString(c);
                        out.append("\\u");
                        for (int pad = hex.length(); pad < 4; pad++) {
                            out.append('0');
                        }
                        out.append(hex);
                    } else {
                        out.append(c);
                    }
            }
        }
        out.append('"');
    }

    private static final class Parser {
        private final String text;
        private int index;

        Parser(String text) {
            this.text = text;
        }

        int position() {
            return index;
        }

        boolean atEnd() {
            return index >= text.length();
        }

        void skipWhitespace() {
            while (index < text.length()) {
                char c = text.charAt(index);
                if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
                    index++;
                } else {
                    break;
                }
            }
        }

        Object value() {
            skipWhitespace();
            if (index >= text.length()) {
                throw new IllegalArgumentException("unexpected end of JSON");
            }
            char c = text.charAt(index);
            switch (c) {
                case '{':
                    return object();
                case '[':
                    return array();
                case '"':
                    return string();
                case 't':
                    expect("true");
                    return Boolean.TRUE;
                case 'f':
                    expect("false");
                    return Boolean.FALSE;
                case 'n':
                    expect("null");
                    return null;
                default:
                    return number();
            }
        }

        private void expect(String literal) {
            if (!text.startsWith(literal, index)) {
                throw new IllegalArgumentException("invalid JSON literal at offset " + index);
            }
            index += literal.length();
        }

        private Map<String, Object> object() {
            Map<String, Object> result = new LinkedHashMap<String, Object>();
            index++;
            skipWhitespace();
            if (index < text.length() && text.charAt(index) == '}') {
                index++;
                return result;
            }
            while (true) {
                skipWhitespace();
                String key = string();
                skipWhitespace();
                if (index >= text.length() || text.charAt(index) != ':') {
                    throw new IllegalArgumentException("expected ':' at offset " + index);
                }
                index++;
                result.put(key, value());
                skipWhitespace();
                if (index >= text.length()) {
                    throw new IllegalArgumentException("unterminated JSON object");
                }
                char c = text.charAt(index++);
                if (c == '}') {
                    return result;
                }
                if (c != ',') {
                    throw new IllegalArgumentException("expected ',' at offset " + (index - 1));
                }
            }
        }

        private List<Object> array() {
            List<Object> result = new ArrayList<Object>();
            index++;
            skipWhitespace();
            if (index < text.length() && text.charAt(index) == ']') {
                index++;
                return result;
            }
            while (true) {
                result.add(value());
                skipWhitespace();
                if (index >= text.length()) {
                    throw new IllegalArgumentException("unterminated JSON array");
                }
                char c = text.charAt(index++);
                if (c == ']') {
                    return result;
                }
                if (c != ',') {
                    throw new IllegalArgumentException("expected ',' at offset " + (index - 1));
                }
            }
        }

        private String string() {
            if (index >= text.length() || text.charAt(index) != '"') {
                throw new IllegalArgumentException("expected string at offset " + index);
            }
            index++;
            StringBuilder out = new StringBuilder();
            while (index < text.length()) {
                char c = text.charAt(index++);
                if (c == '"') {
                    return out.toString();
                }
                if (c != '\\') {
                    out.append(c);
                    continue;
                }
                if (index >= text.length()) {
                    break;
                }
                char escaped = text.charAt(index++);
                switch (escaped) {
                    case '"':
                        out.append('"');
                        break;
                    case '\\':
                        out.append('\\');
                        break;
                    case '/':
                        out.append('/');
                        break;
                    case 'b':
                        out.append('\b');
                        break;
                    case 'f':
                        out.append('\f');
                        break;
                    case 'n':
                        out.append('\n');
                        break;
                    case 'r':
                        out.append('\r');
                        break;
                    case 't':
                        out.append('\t');
                        break;
                    case 'u':
                        if (index + 4 > text.length()) {
                            throw new IllegalArgumentException("invalid unicode escape");
                        }
                        out.append((char) Integer.parseInt(text.substring(index, index + 4), 16));
                        index += 4;
                        break;
                    default:
                        throw new IllegalArgumentException("invalid escape \\" + escaped);
                }
            }
            throw new IllegalArgumentException("unterminated string");
        }

        private Object number() {
            int start = index;
            if (index < text.length() && (text.charAt(index) == '-' || text.charAt(index) == '+')) {
                index++;
            }
            boolean floating = false;
            while (index < text.length()) {
                char c = text.charAt(index);
                if (c >= '0' && c <= '9') {
                    index++;
                } else if (c == '.' || c == 'e' || c == 'E' || c == '-' || c == '+') {
                    floating = floating || c == '.' || c == 'e' || c == 'E';
                    index++;
                } else {
                    break;
                }
            }
            String number = text.substring(start, index);
            if (number.isEmpty()) {
                throw new IllegalArgumentException("invalid number at offset " + start);
            }
            if (!floating) {
                try {
                    return Long.valueOf(number);
                } catch (NumberFormatException ignored) {
                    // Fall through to double for values outside long range.
                }
            }
            return Double.valueOf(number);
        }
    }
}
