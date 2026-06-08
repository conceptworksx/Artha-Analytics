import re


def fix_markdown_tables(report: str) -> str:
    lines = report.split("\n")
    cleaned = []

    for i, line in enumerate(lines):
        # Strip leading whitespace from table rows
        stripped = line.lstrip()
        if stripped.startswith("|"):
            line = stripped

        # Drop blank lines that sit between two table lines
        if line.strip() == "":
            prev = cleaned[-1].strip() if cleaned else ""
            # peek at next non-empty line
            next_line = ""
            for j in range(i + 1, len(lines)):
                if lines[j].strip():
                    next_line = lines[j].strip()
                    break
            if prev.startswith("|") and next_line.startswith("|"):
                continue  # drop blank line between table rows

        cleaned.append(line)

    return "\n".join(cleaned)
