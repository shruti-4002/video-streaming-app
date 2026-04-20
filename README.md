REAL TIME STREAMING PLATFROM
![System Design Diagram](./assets/system-design.png)

# Video Upload Processing: Optimization Report

## Hardware Specifications
* **CPU:** 2 Physical Cores
* **Threads:** 4 Logical Threads
* **Runtime:** Node.js with BullMQ

---

## Performance Test Matrix

| Test ID | Setup | Node Instances/Docker Container | Concurrency | Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Test 1** | 1 Thread | 1 | 1 | Redis Heartbeat blocked (I/O Bottleneck) | ❌ Failed |
| **Test 2** | 1 Thread | 2 | 1 | CPU Starvation (High Context Switching) | ❌ Failed |
| **Test 3** | 1 Thread | 1 | 1 | Stable sequential processing (Optimal) | ✅ Passed |
| **Test 4** | 2 Threads | 1 | 1 | Functional, but slow (Context Switching overhead) | ⚠️ Suboptimal |

---

## Analysis of Results

### Why Test 3 is the Optimal Configuration
After stress-testing with 4 parallel video uploads, **Test 3** was the only configuration that maintained system stability and maximum speed. 

* **The Context Switching Factor:** As observed in **Test 4**, increasing to 2 threads for a single-concurrency task resulted in functional processing, but the system was slower. This is due to the CPU overhead of context switching between the threads, which offsets the gains of adding an extra thread for I/O-bound tasks.
* **Elimination of Bottlenecks:** By limiting the system to 1 Node instance with 1 concurrency (Test 3), we eliminated unnecessary CPU overhead, allowing the processor to focus entirely on the heavy I/O tasks required for video processing.
* **Redis Heartbeat Stability:** Sequential processing ensures the heartbeat remains active at all times, preventing job failures.
* **Resource Allocation:** On a 2-core machine, attempting to run multiple instances or multiple threads (Test 2 & Test 4) leads to resource contention and performance degradation. 

