"""
Tests for zero-trust SQL execution.
"""

import pytest
from backend.zero_trust_sql import SQLFirewall


class TestSQLFirewall:
    def test_select_allowed(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("SELECT * FROM matches")
        assert is_safe

    def test_delete_blocked(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("DELETE FROM matches")
        assert not is_safe
        assert "BLOCKED" in reason

    def test_drop_blocked(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("DROP TABLE matches")
        assert not is_safe

    def test_injection_blocked(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("SELECT * FROM matches; DROP TABLE matches")
        assert not is_safe

    def test_union_injection_blocked(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("SELECT * FROM matches UNION SELECT * FROM exceptions")
        assert not is_safe

    def test_comment_blocked(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("SELECT * FROM matches -- drop table")
        assert not is_safe

    def test_insert_blocked(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("INSERT INTO matches VALUES (1)")
        assert not is_safe

    def test_non_select_blocked(self):
        fw = SQLFirewall()
        is_safe, reason = fw.check_query("UPDATE matches SET verified = 1")
        assert not is_safe

    def test_audit_log_recorded(self):
        fw = SQLFirewall()
        fw.check_query("DROP TABLE matches")
        fw.check_query("SELECT 1")
        assert len(fw.audit_log) == 2
        assert fw.get_blocked_count() == 1
