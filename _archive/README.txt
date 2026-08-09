Retired files, moved here during the 2026-08-09 security hardening pass.
None of them were referenced by any page still in use.

save_report.php  BROKEN. Included 'dbconnection.php' (a file that does not
                 exist - the real one is db_connection.php) and inserted into
                 an 'exact_location' column that is not in the schema. It was
                 also a public POST endpoint with no CSRF or validation.
                 index.php handles submissions; this was dead and unsafe.
indexa.php       Orphan signup form, not wired to any table or page. Superseded
                 by login.php / setup_admin.php.
indexk.php       Empty file (0 bytes).
list.txt         Empty file (0 bytes).
list.html        Early static mockups, superseded by the PHP pages.
polish.html
save.html
script.html
todo.html
todo_2.html
test.sql         Early schema draft. The authoritative schema is now created by
                 db_connection.php.

Delete this directory once you are satisfied nothing here is needed.
