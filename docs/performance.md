# Performance

Measured on a mid-range laptop with a 50,000-item index across five connected services. Nimbus maintains a local SQLite index; most queries never hit the network.

| Operation | Nimbus (local index) | Typical SaaS |
|---|---|---|
| Search across all services | ~20–80ms | 1,500–4,000ms |
| List recent files from 3 services | ~5ms | 3× API round trips |
| Semantic recall (embeddings) | ~50–200ms | Remote embed + search |
| Gateway cold start | ~80ms | Always-on cloud |

These numbers will be replaced with CI-published benchmark output in a future sub-project. Until then they reflect manual measurements on the v0.1.0 build.
