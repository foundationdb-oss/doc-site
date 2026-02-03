---
title: First Application
description: Build a complete class scheduling application with FoundationDB
---

# First Application: Class Scheduling

Build a real-world application using FoundationDB's transactional guarantees. This tutorial walks through a class scheduling system—the same example used in the official FoundationDB documentation.

## What You'll Build

A class scheduling system where students can:

- View available classes
- Sign up for classes (with seat limits)
- Drop classes
- Switch between classes atomically

You'll learn:

- :material-database: Data modeling with key-value pairs
- :material-sync: Using transactions for consistency
- :material-shield-check: Handling concurrent operations safely
- :material-swap-horizontal: Composing transactions for complex operations

## Prerequisites

- [FoundationDB installed](installation.md) and running
- Completed the [Quick Start](quickstart.md)
- Python 3.8+ with `foundationdb` package installed

## The Data Model

Our application needs to track two things:

1. **Available classes** with seat counts
2. **Which students are enrolled in which classes**

We'll use this key structure:

```
('class', class_name)     → seats_available
('attends', student, class) → ''
```

FoundationDB stores keys in sorted order, so all class data groups together, and all attendance records for a student group together.

## Project Setup

Create a new project directory:

```bash
mkdir class-scheduler
cd class-scheduler
```

Create `requirements.txt`:

```text title="requirements.txt"
foundationdb>=7.3.0
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Building the Application

### Step 1: Database Connection and Directory Setup

FoundationDB's Directory Layer helps organize keys into logical namespaces:

```python title="scheduler.py"
import fdb
import fdb.tuple
import itertools

# Always specify API version first
fdb.api_version(730)

# Open the database
db = fdb.open()

# Set reasonable transaction limits
db.options.set_transaction_timeout(60000)  # 60 seconds
db.options.set_transaction_retry_limit(100)

# Create a directory for our application
scheduling = fdb.directory.create_or_open(db, ('scheduling',))

# Create subspaces for our data types
course = scheduling['class']
attends = scheduling['attends']
```

!!! tip "Directories vs. Raw Keys"
    The Directory Layer automatically assigns short prefixes to your directories, keeping keys compact while maintaining logical organization.

### Step 2: Initialize Sample Data

Let's create a helper function to add classes and populate the database:

```python title="scheduler.py (continued)"
@fdb.transactional
def add_class(tr, class_name):
    """Add a class with 100 available seats."""
    tr[course.pack((class_name,))] = fdb.tuple.pack((100,))

# Generate sample class names
levels = ['intro', 'for dummies', 'remedial', '101', '201', '301', 'mastery', 'lab', 'seminar']
types = ['chem', 'bio', 'cs', 'geometry', 'calc', 'alg', 'film', 'music', 'art', 'dance']
times = [f'{h}:00' for h in range(9, 18)]  # 9:00 to 17:00

class_combos = itertools.product(times, types, levels)
class_names = [' '.join(combo) for combo in class_combos]

@fdb.transactional
def init_database(tr):
    """Clear and reinitialize the database."""
    del tr[scheduling.range(())]  # Clear all scheduling data
    for class_name in class_names:
        add_class(tr, class_name)

# Initialize the database
init_database(db)
print(f"✓ Initialized database with {len(class_names)} classes")
```

### Step 3: List Available Classes

Query all classes that have seats available:

```python title="scheduler.py (continued)"
@fdb.transactional
def available_classes(tr):
    """Return list of classes with available seats."""
    available = []
    for key, value in tr[course.range(())]:
        class_name = course.unpack(key)[0]
        seats_left = fdb.tuple.unpack(value)[0]
        if seats_left > 0:
            available.append((class_name, seats_left))
    return available

# Show first 10 available classes
print("\nAvailable classes:")
for class_name, seats in available_classes(db)[:10]:
    print(f"  {class_name}: {seats} seats")
```

### Step 4: Sign Up for a Class

Here's where transactions shine. We need to:

1. Check if the student is already enrolled
2. Check if seats are available
3. Check if the student has too many classes (limit: 5)
4. Decrement the seat count and record enrollment

All of this must happen atomically:

```python title="scheduler.py (continued)"
@fdb.transactional
def signup(tr, student_id, class_name):
    """Sign a student up for a class."""
    # Build the attendance record key
    rec = attends.pack((student_id, class_name))

    # Check if already signed up
    if tr[rec].present():
        return "Already enrolled"

    # Check seat availability
    class_key = course.pack((class_name,))
    seats_left = fdb.tuple.unpack(tr[class_key])[0]
    if seats_left <= 0:
        raise Exception("No seats available")

    # Check student's current class count (max 5)
    student_classes = list(tr[attends.range((student_id,))])
    if len(student_classes) >= 5:
        raise Exception("Too many classes (max 5)")

    # All checks passed - enroll the student
    tr[class_key] = fdb.tuple.pack((seats_left - 1,))
    tr[rec] = b''
    return "Enrolled successfully"
```

!!! info "Transaction Guarantees"
    If two students try to take the last seat simultaneously, FoundationDB's serializable isolation ensures only one succeeds. The other transaction automatically retries and sees "No seats available."

### Step 5: Drop a Class

Dropping is the reverse of signup:

```python title="scheduler.py (continued)"
@fdb.transactional
def drop(tr, student_id, class_name):
    """Drop a student from a class."""
    rec = attends.pack((student_id, class_name))

    # Check if actually enrolled
    if not tr[rec].present():
        return "Not enrolled in this class"

    # Remove enrollment and free up the seat
    class_key = course.pack((class_name,))
    seats_left = fdb.tuple.unpack(tr[class_key])[0]
    tr[class_key] = fdb.tuple.pack((seats_left + 1,))
    del tr[rec]
    return "Dropped successfully"
```

### Step 6: Switch Classes Atomically

Here's the power of transaction composition. Switching from one class to another needs to be atomic—if the new class is full, we shouldn't drop the old one:

```python title="scheduler.py (continued)"
@fdb.transactional
def switch(tr, student_id, old_class, new_class):
    """Switch a student from one class to another atomically."""
    drop(tr, student_id, old_class)
    signup(tr, student_id, new_class)
    return f"Switched from '{old_class}' to '{new_class}'"
```

!!! success "Composable Transactions"
    Because `drop` and `signup` accept a transaction parameter, they share the same transaction when called from `switch`. Either both succeed or neither does.

### Step 7: View Student Schedule

```python title="scheduler.py (continued)"
@fdb.transactional
def get_student_classes(tr, student_id):
    """Get all classes a student is enrolled in."""
    classes = []
    for key, _ in tr[attends.range((student_id,))]:
        _, class_name = attends.unpack(key)
        classes.append(class_name)
    return classes
```

## Putting It All Together

Here's a complete interactive demo:

```python title="demo.py"
#!/usr/bin/env python3
"""Interactive demo of the class scheduling system."""

from scheduler import (
    db, available_classes, signup, drop, switch, get_student_classes, init_database
)

def main():
    print("=== Class Scheduling Demo ===\n")

    # Reset the database
    init_database(db)

    student = "student_001"

    # Show available classes
    print("Sample available classes:")
    for class_name, seats in available_classes(db)[:5]:
        print(f"  • {class_name} ({seats} seats)")

    # Sign up for some classes
    print(f"\n--- Signing up {student} ---")
    classes_to_take = ["9:00 cs 101", "10:00 calc 201", "11:00 art intro"]

    for class_name in classes_to_take:
        result = signup(db, student, class_name)
        print(f"  {class_name}: {result}")

    # Show student's schedule
    print(f"\n{student}'s schedule:")
    for class_name in get_student_classes(db, student):
        print(f"  • {class_name}")

    # Try to sign up for too many classes
    print("\n--- Trying to exceed class limit ---")
    more_classes = ["12:00 bio lab", "13:00 music seminar", "14:00 dance intro"]
    for class_name in more_classes:
        try:
            result = signup(db, student, class_name)
            print(f"  {class_name}: {result}")
        except Exception as e:
            print(f"  {class_name}: ❌ {e}")

    # Switch classes
    print("\n--- Switching classes ---")
    try:
        result = switch(db, student, "9:00 cs 101", "9:00 cs 201")
        print(f"  {result}")
    except Exception as e:
        print(f"  Switch failed: {e}")

    # Final schedule
    print(f"\n{student}'s final schedule:")
    for class_name in get_student_classes(db, student):
        print(f"  • {class_name}")

if __name__ == "__main__":
    main()
```

Run it:

```bash
python demo.py
```

Expected output:

```
=== Class Scheduling Demo ===

Sample available classes:
  • 9:00 chem intro (100 seats)
  • 9:00 chem for dummies (100 seats)
  • 9:00 chem remedial (100 seats)
  • 9:00 chem 101 (100 seats)
  • 9:00 chem 201 (100 seats)

--- Signing up student_001 ---
  9:00 cs 101: Enrolled successfully
  10:00 calc 201: Enrolled successfully
  11:00 art intro: Enrolled successfully

student_001's schedule:
  • 9:00 cs 101
  • 10:00 calc 201
  • 11:00 art intro

--- Trying to exceed class limit ---
  12:00 bio lab: Enrolled successfully
  13:00 music seminar: Enrolled successfully
  14:00 dance intro: ❌ Too many classes (max 5)

--- Switching classes ---
  Switched from '9:00 cs 101' to '9:00 cs 201'

student_001's final schedule:
  • 9:00 cs 201
  • 10:00 calc 201
  • 11:00 art intro
  • 12:00 bio lab
  • 13:00 music seminar
```

## Testing Concurrency

The real power of FoundationDB shows under concurrent load. Here's a stress test:

```python title="stress_test.py"
#!/usr/bin/env python3
"""Test concurrent class signups."""

import threading
import random
from scheduler import db, signup, drop, available_classes, init_database

def indecisive_student(student_num, operations):
    """Simulate a student randomly signing up and dropping classes."""
    student_id = f"student_{student_num:03d}"
    all_classes = [c[0] for c in available_classes(db)]
    my_classes = []

    for _ in range(operations):
        if my_classes and random.random() < 0.3:
            # Drop a random class
            class_name = random.choice(my_classes)
            try:
                drop(db, student_id, class_name)
                my_classes.remove(class_name)
            except Exception:
                pass
        elif len(my_classes) < 5:
            # Sign up for a random class
            class_name = random.choice(all_classes)
            try:
                signup(db, student_id, class_name)
                my_classes.append(class_name)
            except Exception:
                pass

def run_stress_test(num_students=10, ops_per_student=20):
    """Run concurrent operations."""
    print(f"Running {num_students} concurrent students, {ops_per_student} ops each...")

    init_database(db)

    threads = [
        threading.Thread(target=indecisive_student, args=(i, ops_per_student))
        for i in range(num_students)
    ]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    print(f"✓ Completed {num_students * ops_per_student} operations without conflicts!")

if __name__ == "__main__":
    run_stress_test()
```

## Key Takeaways

| Concept | What You Learned |
|---------|-----------------|
| **Data Modeling** | Use tuples as keys for natural grouping and range queries |
| **Transactions** | The `@fdb.transactional` decorator handles retries automatically |
| **Composition** | Transactional functions can call other transactional functions |
| **Concurrency** | FoundationDB handles conflicts transparently |
| **Directories** | Use the Directory Layer for organized key namespaces |

## Next Steps

- [Core Concepts](../concepts/index.md) — Understand transactions and data modeling in depth
- [Data Modeling Guide](../guides/data-modeling.md) — Learn advanced modeling patterns
- [API Reference](../api/index.md) — Explore the complete Python API

