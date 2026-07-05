package shared

import "fmt"

// ===== SQL Dialect Helpers =====
//
// These helpers abstract the differences between SQLite and PostgreSQL
// for date/time arithmetic and string aggregation, so the rest of the
// codebase can use the same function calls regardless of DBDriver.

// NowMinusDays returns a SQL expression for "now minus N days".
//
//	SQLite:   datetime('now', '-7 days')
//	Postgres: NOW() - INTERVAL '7 days'
func NowMinusDays(days int) string {
	if DBDriver == "postgres" {
		return fmt.Sprintf("NOW() - INTERVAL '%d days'", days)
	}
	return fmt.Sprintf("datetime('now', '-%d days')", days)
}

// NowMinusSeconds returns a SQL expression for "now minus N seconds".
func NowMinusSeconds(sec int) string {
	if DBDriver == "postgres" {
		return fmt.Sprintf("NOW() - INTERVAL '%d seconds'", sec)
	}
	return fmt.Sprintf("datetime('now', '-%d seconds')", sec)
}

// CurrentDate returns a SQL expression for "today's date".
//
//	CURRENT_DATE works in both SQLite and PostgreSQL.
func CurrentDate() string {
	return "CURRENT_DATE"
}

// DateOf returns a SQL expression for extracting the date part of a column.
//
//	SQLite:   date(column)
//	Postgres: DATE(column)
//	Both accept the function form, so we return DATE(col).
func DateOf(col string) string {
	return fmt.Sprintf("DATE(%s)", col)
}

// GroupConcat returns a SQL expression for aggregating strings with a separator.
//
//	SQLite:   GROUP_CONCAT(expr, sep)
//	Postgres: STRING_AGG(expr, sep)
func GroupConcat(expr, sep string) string {
	if DBDriver == "postgres" {
		return fmt.Sprintf("STRING_AGG(%s, '%s')", expr, sep)
	}
	return fmt.Sprintf("GROUP_CONCAT(%s, '%s')", expr, sep)
}

// GroupConcatExpr is like GroupConcat but the separator is a SQL expression
// rather than a literal string (useful for special characters).
func GroupConcatExpr(expr, sepExpr string) string {
	if DBDriver == "postgres" {
		return fmt.Sprintf("STRING_AGG(%s, %s)", expr, sepExpr)
	}
	return fmt.Sprintf("GROUP_CONCAT(%s, %s)", expr, sepExpr)
}
