---
name: GitHub connector publishing
description: Environment-specific guidance for publishing repository trees through the connected GitHub API.
---

When publishing a local Git tree through the GitHub connector, reconstruct complex path lists in the same CodeExecution call that uses them. For deleted files, use the GitHub Contents DELETE operation rather than sending a tree entry with a null SHA.

**Why:** In this environment, complex values carried across durable executions can trigger an opaque Pattern validation error, and the connector rejects the null SHA tree form even though GitHub's Git Trees API documents it.

**How to apply:** Verify the remote branch SHA before writing, create blobs and a tree from freshly reconstructed paths, update the ref without force, and verify the resulting ref and deleted paths afterward.

When a Git Trees payload is rejected or the sandbox reports a Pattern validation error, the GitHub Contents API is a reliable fallback: fetch each current file SHA and update files sequentially without force-pushing.

**Why:** The connector's durable payload validation can reject large or complex tree arguments even when the individual GitHub write endpoints work.

**How to apply:** Keep file contents inside the connector call, omit `sha` only for new files, and verify the final branch tree against local file hashes.