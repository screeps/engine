"use strict";

//
// Simple open-closed list
exports.OpenClosed = class OpenClosed {
    constructor(size) {
        this.list = new Uint8Array(size);
        this.marker = 1;
    }

    clear() {
        if (this.marker >= 253) {
            this.list = new Uint8Array(this.list.length);
            this.marker = 1;
        } else {
            this.marker += 2;
        }
    }

    isOpen(index) {
        return this.list[index] === this.marker;
    }

    isClosed(index) {
        return this.list[index] === this.marker + 1;
    }

    open(index) {
        this.list[index] = this.marker;
    }

    close(index) {
        this.list[index] = this.marker + 1;
    }
}

//
// Priority queue implementation w/ support for updating priorities
exports.Heap = class Heap {
    constructor(size, ctor) {
        this.priorities = new (ctor || Uint16Array)(size + 1);
        this.heap = new Uint16Array(size + 1);
        this.size_ = 0;
    }

    minPriority() {
        return this.priorities[this.heap[1]];
    }

    min() {
        return this.heap[1];
    }

    size() {
        return this.size_;
    }

    priority(index) {
        return this.priorities[index];
    }

    pop() {
        this.heap[1] = this.heap[this.size_];
        --this.size_;
        let vv = 1;
        do {
            let uu = vv;
            if ((uu << 1) + 1 <= this.size_) {
                if (this.priorities[this.heap[uu]] >= this.priorities[this.heap[uu << 1]]) {
                    vv = uu << 1;
                }
                if (this.priorities[this.heap[vv]] >= this.priorities[this.heap[(uu << 1) + 1]]) {
                    vv = (uu << 1) + 1;
                }
            } else if (uu << 1 <= this.size_) {
                if (this.priorities[this.heap[uu]] >= this.priorities[this.heap[uu << 1]]) {
                    vv = uu << 1;
                }
            }
            if (uu !== vv) {
                let tmp = this.heap[uu];
                this.heap[uu] = this.heap[vv];
                this.heap[vv] = tmp;
            } else {
                return;
            }
        } while (true);
    }

    push(index, priority) {
        this.priorities[index] = priority;
        let ii = ++this.size_;
        this.heap[ii] = index;
        this.bubbleUp(ii);
    }

    update(index, priority) {
        for (let ii = this.size_; ii > 0; --ii) {
            if (this.heap[ii] === index) {
                this.priorities[index] = priority;
                this.bubbleUp(ii);
                return;
            }
        }
    }

    bubbleUp(ii) {
        while (ii !== 1) {
            if (this.priorities[this.heap[ii]] <= this.priorities[this.heap[ii >>> 1]]) {
                let tmp = this.heap[ii];
                this.heap[ii] = this.heap[ii >>> 1];
                this.heap[ii = ii >>> 1] = tmp;
            } else {
                return;
            }
        }
    }

    clear() {
        this.size_ = 0;
    }
}

