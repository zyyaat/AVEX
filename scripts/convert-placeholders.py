#!/usr/bin/env python3
"""
Convert all SQL ? placeholders to PostgreSQL $N numbered placeholders.
Handles:
- Backtick (raw) strings: `SELECT ... WHERE id = ?`
- Double-quoted strings: "SELECT ... WHERE id = ?"
- Skips ? inside SQL single-quoted string literals: 'text with ? here'
- Skips ? that are not in SQL context (e.g. Go format strings)
"""
import re
import sys
import os

def convert_sql_placeholders(sql_string):
    """Convert ? to $1, $2, ... within a SQL string, respecting single-quote literals."""
    result = []
    i = 0
    n = len(sql_string)
    placeholder_num = 1
    in_single_quote = False

    while i < n:
        ch = sql_string[i]

        if ch == "'" and not in_single_quote:
            # Check if this is an escaped single quote ('') 
            if i + 1 < n and sql_string[i + 1] == "'":
                result.append("''")
                i += 2
                continue
            in_single_quote = True
            result.append(ch)
            i += 1
            continue
        elif ch == "'" and in_single_quote:
            # Check for escaped single quote
            if i + 1 < n and sql_string[i + 1] == "'":
                result.append("''")
                i += 2
                continue
            in_single_quote = False
            result.append(ch)
            i += 1
            continue
        elif ch == '?' and not in_single_quote:
            result.append(f'${placeholder_num}')
            placeholder_num += 1
            i += 1
            continue
        else:
            result.append(ch)
            i += 1

    return ''.join(result)


def process_go_file(filepath):
    """Process a .go file, converting ? in SQL strings to $N."""
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    result = []
    i = 0
    n = len(content)

    while i < n:
        # Check for backtick string (raw string literal)
        if content[i] == '`':
            # Find the closing backtick
            j = i + 1
            while j < n and content[j] != '`':
                j += 1
            if j < n:
                # Extract the raw string content (including backticks)
                raw_content = content[i+1:j]
                # Check if it looks like SQL (contains SELECT, INSERT, UPDATE, DELETE, etc.)
                upper = raw_content.upper()
                if any(kw in upper for kw in ['SELECT', 'INSERT INTO', 'UPDATE ', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'ON CONFLICT']):
                    converted = convert_sql_placeholders(raw_content)
                    result.append('`' + converted + '`')
                else:
                    result.append(content[i:j+1])
                i = j + 1
                continue

        # Check for double-quoted string
        elif content[i] == '"':
            # Find the closing quote (handle escape sequences)
            j = i + 1
            while j < n:
                if content[j] == '\\':
                    j += 2
                    continue
                if content[j] == '"':
                    break
                j += 1
            if j < n:
                # Extract the string content (including quotes)
                str_content = content[i+1:j]
                # Unescape to check content
                unescaped = str_content.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')
                upper = unescaped.upper()
                if any(kw in upper for kw in ['SELECT', 'INSERT INTO', 'UPDATE ', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'ON CONFLICT']):
                    converted = convert_sql_placeholders(str_content)
                    result.append('"' + converted + '"')
                else:
                    result.append(content[i:j+1])
                i = j + 1
                continue

        # Check for single-line comment
        elif content[i:i+2] == '//':
            j = content.find('\n', i)
            if j == -1:
                j = n
            result.append(content[i:j])
            i = j
            continue

        # Check for multi-line comment
        elif content[i:i+2] == '/*':
            j = content.find('*/', i+2)
            if j == -1:
                j = n
            else:
                j += 2
            result.append(content[i:j])
            i = j
            continue

        # Regular character
        result.append(content[i])
        i += 1

    new_content = ''.join(result)
    if new_content != original:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False


def main():
    backend_dir = '/home/z/my-project/backend/internal'
    changed = 0
    total = 0
    for root, dirs, files in os.walk(backend_dir):
        for fname in files:
            if fname.endswith('.go'):
                fpath = os.path.join(root, fname)
                total += 1
                if process_go_file(fpath):
                    changed += 1
                    print(f"  converted: {fpath}")
    print(f"\nDone: {changed}/{total} files updated")


if __name__ == '__main__':
    main()
