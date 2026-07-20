import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Search, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const programmingCoursesData = [
  {
    title: "C++ Training",
    tag: "High Performance",
    tagBg: "bg-blue-50 text-blue-600 border border-blue-100",
    desc: "Deepen your knowledge of system-level programming. Gain complete control over memory allocation, pointer arithmetic, structures, object-oriented concepts, and standard template libraries.",
    focusAreas: [
      "Pointers & References",
      "Manual Memory Management",
      "Standard Template Library (STL)",
      "Efficient Algorithm Writing"
    ],
    svgIcon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <path fill="#00599C" d="M117.5 33.5l-50-28.8c-2.5-1.4-5.5-1.4-8 0l-50 28.8c-2.5 1.4-4 4.1-4 7v57.7c0 2.9 1.5 5.5 4 7l50 28.8c2.5 1.4 5.5 1.4 8 0l50-28.8c2.5-1.4 4-4.1 4-7v-57.7c0-2.9-1.5-5.6-4-7z"/>
        <path fill="#FFF" d="M64 27.2c-15.5 0-28 12.5-28 28.8s12.5 28.8 28 28.8c8.8 0 16.7-4.1 21.8-10.5l-9.1-6.8c-3.1 3.9-7.9 6.3-12.7 6.3-9.9 0-18-8.1-18-17.8s8.1-17.8 18-17.8c4.8 0 9.6 2.4 12.7 6.3l9.1-6.8c-5.1-6.4-13-10.5-21.8-10.5z"/>
        <path fill="#FFF" d="M85 52h8v4h-8v8h-4v-8h-8v-4h8v-8h4v8zm20 0h8v4h-8v8h-4v-8h-8v-4h8v-8h4v8z"/>
      </svg>
    )
  },
  {
    title: "Python Training",
    tag: "Beginner-Friendly",
    tagBg: "bg-amber-50 text-amber-700 border border-amber-100",
    desc: "Learn general-purpose programming with Python. Covers basic syntax, functions, modules, recursion, list/dict comprehensions, file handling, and exception management.",
    focusAreas: [
      "Clean Syntax & Scripting",
      "Data Structure Manipulation",
      "Functional Programming",
      "File & Error Handling"
    ],
    svgIcon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <path fill="#3776AB" d="M64 4c-15.8 0-25.1 6.9-25.1 19.8v10.6h25.7V38H39.2c-12.1 0-21.1 8.9-21.1 21v16.5c0 12.1 9.5 20.3 21.1 20.3h8.3V83.9c0-10.6 8.7-19.3 19.3-19.3h25.7V39c0-15.8-10.3-35-28.5-35zm-9.2 8.3a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2z"/>
        <path fill="#FFE873" d="M64 124c15.8 0 25.1-6.9 25.1-19.8V93.6H63.4V90h25.4c12.1 0 21.1-8.9 21.1-21V52.5c0-12.1-9.5-20.3-21.1-20.3h-8.3v11.9c0 10.6-8.7 19.3-19.3 19.3H35.5V89c0 15.8 10.3 35 28.5 35zm9.2-8.3a4.6 4.6 0 1 1 0-9.2 4.6 4.6 0 0 1 0-9.2z"/>
      </svg>
    )
  },
  {
    title: "Core Java Training",
    tag: "25-Day Track",
    tagBg: "bg-purple-50 text-purple-600 border border-purple-100",
    desc: "Solidify your object-oriented programming foundation. Master variables, operators, loops, arrays, inheritance, polymorphism, interfaces, exceptions, and collections.",
    focusAreas: [
      "OOP Foundations",
      "Java Collections Framework",
      "Multithreading & Serialization",
      "Console Mini-Project"
    ],
    svgIcon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <path fill="#5382A1" d="M64 8C33.1 8 8 33.1 8 64s25.1 56 56 56 56-25.1 56-56S94.9 8 64 8zm15 76c-3 5-9 9-15 9-11 0-20-9-20-20s9-20 20-20c5 0 9 2 12 5l-4 4c-2-2-5-3-8-3-8 0-14 6-14 14s6 14 14 14c3 0 6-1 8-3v-6h-8v-4h12v13l-3 1zm12.5-34.4c-.9.9-2 .1-2-.1 0-1.8.6-4.5.6-7 0-4.9-1.9-9.1-4.7-12.2-.6-.7-.1-1.3.5-1.1 3.5 1.5 7.6 5.8 7.6 12.1 0 3.3-.9 6.2-2 8.3zm-11.4 7.6c-.6.6-1.5.3-1.5.1 0-1.4.3-3.6.3-5.5 0-3.8-1.5-7-3.7-9.5-.5-.6-.1-1 .4-.9 2.7 1.2 5.9 4.5 5.9 9.5 0 2.6-.7 4.9-1.4 6.4z"/>
        <path fill="#EA2D30" d="M84.2 61.2c-.3-.9-1.3-1.5-2.2-1.2-1 .3-1.5 1.3-1.2 2.2.4 1.3.6 2.7.6 4.1 0 6.6-5.4 12-12 12s-12-5.4-12-12c0-3.9 1.9-7.5 5-9.7l6.8-5.6c.8-.6.8-1.8 0-2.4l-11.8-8.8c-.8-.6-1.9-.3-2.3.6l-5.6 11.2C46.8 56.6 45 62.1 45 68c0 13.8 11.2 25 25 25s25-11.2 25-25c0-4.3-.9-8.4-2.8-11.8z"/>
      </svg>
    )
  },
  {
    title: "Java DSA Training",
    tag: "Problem Solving",
    tagBg: "bg-red-50 text-red-600 border border-red-100",
    desc: "Master the structures and algorithms needed to write optimized code and ace technical interviews. Recursion, sorting/searching paradigms, linked lists, stacks, queues, trees, and graphs.",
    focusAreas: [
      "Time & Space Complexity",
      "Advanced Tree/BST & AVL",
      "Graph BFS/DFS & Dijkstra",
      "HackerRank & LeetCode Prep"
    ],
    svgIcon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <path fill="#5382A1" d="M64 8C33.1 8 8 33.1 8 64s25.1 56 56 56 56-25.1 56-56S94.9 8 64 8zm15 76c-3 5-9 9-15 9-11 0-20-9-20-20s9-20 20-20c5 0 9 2 12 5l-4 4c-2-2-5-3-8-3-8 0-14 6-14 14s6 14 14 14c3 0 6-1 8-3v-6h-8v-4h12v13l-3 1zm12.5-34.4c-.9.9-2 .1-2-.1 0-1.8.6-4.5.6-7 0-4.9-1.9-9.1-4.7-12.2-.6-.7-.1-1.3.5-1.1 3.5 1.5 7.6 5.8 7.6 12.1 0 3.3-.9 6.2-2 8.3zm-11.4 7.6c-.6.6-1.5.3-1.5.1 0-1.4.3-3.6.3-5.5 0-3.8-1.5-7-3.7-9.5-.5-.6-.1-1 .4-.9 2.7 1.2 5.9 4.5 5.9 9.5 0 2.6-.7 4.9-1.4 6.4z"/>
        <path fill="#EA2D30" d="M84.2 61.2c-.3-.9-1.3-1.5-2.2-1.2-1 .3-1.5 1.3-1.2 2.2.4 1.3.6 2.7.6 4.1 0 6.6-5.4 12-12 12s-12-5.4-12-12c0-3.9 1.9-7.5 5-9.7l6.8-5.6c.8-.6.8-1.8 0-2.4l-11.8-8.8c-.8-.6-1.9-.3-2.3.6l-5.6 11.2C46.8 56.6 45 62.1 45 68c0 13.8 11.2 25 25 25s25-11.2 25-25c0-4.3-.9-8.4-2.8-11.8z"/>
      </svg>
    )
  },
  {
    title: "Java Advanced Training (Java+Springboot)",
    tag: "45-Day Track",
    tagBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    desc: "Step into enterprise development. Configure databases with Hibernate ORM, manage dependencies with Spring IoC, build robust REST APIs using Spring Boot, and deploy professional web services.",
    focusAreas: [
      "Spring Boot REST Controllers",
      "Hibernate & JPA Mapping",
      "SQL Joins & CRUD Ops",
      "Full Backend E-Commerce API"
    ],
    svgIcon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <path fill="#6DB33F" d="M64 4C30.9 4 4 30.9 4 64s26.9 60 60 60 60-26.9 60-60S97.1 4 64 4zm16.5 79.1c-4.9 4.9-11.4 7.6-18.4 7.6-6.1 0-11.9-2.1-16.5-5.9l1.4-1.4c3.9 3.1 8.8 4.8 13.9 4.8 5.8 0 11.2-2.3 15.3-6.4 8.4-8.4 8.4-22.1 0-30.5L64 39.5c-4.1-4.1-9.5-6.4-15.3-6.4s-11.2 2.3-15.3 6.4c-8.4 8.4-8.4 22.1 0 30.5l9.2 9.2c.4.4.4 1.1 0 1.5l-1.4 1.4c-1.2 1.2-3.1 1.2-4.2 0l-9.2-9.2c-10.7-10.7-10.7-28.1 0-38.9s28.1-10.7 38.9 0l12.2 12.2c10.7 10.7 10.7 28.1 0 38.9z"/>
      </svg>
    )
  }
];

// Syllabus Data for Java Fundamentals (25 days)
const javaFundamentalsSyllabus = [
  { day: "Day 1", duration: "1.25 Hours", topics: "Course Introduction, Java History, JDK/JRE/JVM Architecture", type: "Theory/Lab" },
  { day: "Day 2", duration: "1.25 Hours", topics: "IDE Setup (IntelliJ/Eclipse), First Program, Compilation Process", type: "Theory/Lab" },
  { day: "Day 3", duration: "1.25 Hours", topics: "Variables, Data Types, Operators & Expressions", type: "Theory/Lab" },
  { day: "Day 4", duration: "1.25 Hours", topics: "Type Casting, Scanner Class, Handling User Input", type: "Theory/Lab" },
  { day: "Day 5", duration: "1.25 Hours", topics: "Conditional Statements (if, if-else, switch-case)", type: "Theory/Lab" },
  { day: "Day 6", duration: "1.25 Hours", topics: "Loops (for, while, do-while), Basic Pattern Programs", type: "Theory/Lab" },
  { day: "Day 7", duration: "1.00 Hours", topics: "PRACTICE CHALLENGE Problem Solving Session: HackerRank Coding Practice Challenge", type: "HackerRank Practice" },
  { day: "Day 8", duration: "1.25 Hours", topics: "Methods (Declaration, Parameters, Return Types), 1D & 2D Arrays", type: "Theory/Lab" },
  { day: "Day 9", duration: "1.25 Hours", topics: "OOP Basics: Classes, Objects, and Memory Allocation (Heap vs. Stack)", type: "Theory/Lab" },
  { day: "Day 10", duration: "1.25 Hours", topics: "Constructors (Default, Parameterized), static keyword, this reference", type: "Theory/Lab" },
  { day: "Day 11", duration: "1.25 Hours", topics: "Encapsulation, Access Modifiers (private, default, protected, public)", type: "Theory/Lab" },
  { day: "Day 12", duration: "1.25 Hours", topics: "Inheritance (IS-A relationship), Method Overriding, super & final keywords", type: "Theory/Lab" },
  { day: "Day 13", duration: "1.25 Hours", topics: "Polymorphism, Abstract Classes vs. Interfaces (Loose Coupling)", type: "Theory/Lab" },
  { day: "Day 14", duration: "1.00 Hours", topics: "PRACTICE CHALLENGE Problem Solving Session: HackerRank Coding Practice Challenge", type: "HackerRank Practice" },
  { day: "Day 15", duration: "1.25 Hours", topics: "Strings, String Manipulation, Wrapper Classes, and Packages", type: "Theory/Lab" },
  { day: "Day 16", duration: "1.25 Hours", topics: "Exception Handling (Try-Catch, Finally, Throw/Throws, Custom Exceptions)", type: "Theory/Lab" },
  { day: "Day 17", duration: "1.25 Hours", topics: "Java Collections Framework: Introduction to List, Set, and Map structures", type: "Theory/Lab" },
  { day: "Day 18", duration: "1.25 Hours", topics: "Generics, Enums, Sorting with Comparable vs. Comparator", type: "Theory/Lab" },
  { day: "Day 19", duration: "1.25 Hours", topics: "File Handling Basics, Streams, and Object Serialization", type: "Theory/Lab" },
  { day: "Day 20", duration: "1.00 Hours", topics: "PRACTICE CHALLENGE Problem Solving Session: HackerRank Coding Practice Challenge", type: "HackerRank Practice" },
  { day: "Day 21", duration: "1.00 Hours", topics: "PRACTICE CHALLENGE Problem Solving Session: HackerRank Coding Practice Challenge", type: "HackerRank Practice" },
  { day: "Day 22", duration: "1.25 Hours", topics: "Multithreading Basics: Lifecycle, Threads creation (Thread class vs Runnable)", type: "Theory/Lab" },
  { day: "Day 23", duration: "1.25 Hours", topics: "Mini Project Kickoff & Implementation (Library or Student Management System)", type: "Project" },
  { day: "Day 24", duration: "1.00 Hours", topics: "PRACTICE CHALLENGE Problem Solving Session: HackerRank Coding Practice Challenge", type: "HackerRank Practice" },
  { day: "Day 25", duration: "1.25 Hours", topics: "Introduction to Spring Boot, REST API Demo, Career Guidance, and Resume Review", type: "Theory/Lab" }
];

// Syllabus Data for Java Full-Stack (45 days)
const javaFullStackSyllabus = Array.from({ length: 45 }, (_, i) => {
  const dayNum = i + 1;
  let topics = "";
  let type = "Theory/Lab";
  let duration = "1.25 Hours";

  if (dayNum <= 5) {
    topics = `Advanced OOP concepts - Day ${dayNum}: ${[
      "Abstract Classes & Interfaces comparison",
      "Multiple Inheritance using Interfaces and Default Methods",
      "Inner Classes, Nested and Static Classes",
      "Anonymous Inner Classes & Lambda Expressions introduction",
      "Object Cloning, Deep vs Shallow Copy"
    ][i]}`;
  } else if (dayNum <= 10) {
    topics = `Collections Framework - Day ${dayNum - 5}: ${[
      "List Interface (ArrayList vs LinkedList internals)",
      "Set Interface (HashSet vs TreeSet sorting)",
      "Map Interface (HashMap hashing and collision resolution)",
      "Queue & Deque implementations (PriorityQueue)",
      "Collections Utility methods, Sorting and Searching"
    ][i - 5]}`;
  } else if (dayNum <= 15) {
    topics = `Java 8 Streams & Files - Day ${dayNum - 10}: ${[
      "Lambda expressions syntax, Functional Interfaces",
      "Stream API operations (Filter, Map, Reduce)",
      "Stream Collectors, Grouping, Partitioning",
      "File I/O, Data Streams, buffering configurations",
      "Serialization and Deserialization implementation"
    ][i - 10]}`;
  } else if (dayNum <= 20) {
    topics = `SQL & JDBC Database Connection - Day ${dayNum - 15}: ${[
      "Relational Database concepts and SQL basics",
      "SQL Joins, Subqueries, Aggregate Functions",
      "JDBC driver architecture and Statement executions",
      "PreparedStatement, ResultSet metadata handling",
      "Connection pooling (HikariCP config) and transactions"
    ][i - 15]}`;
  } else if (dayNum <= 25) {
    topics = `Hibernate ORM Framework - Day ${dayNum - 20}: ${[
      "Hibernate architecture, configuration and setup",
      "Entity Annotation mappings, Primary key generation",
      "CRUD operations using Hibernate Session methods",
      "Association mapping (One-to-One, One-to-Many)",
      "Hibernate Query Language (HQL) & Criteria API"
    ][i - 20]}`;
  } else if (dayNum <= 30) {
    topics = `Spring Core & Framework Foundations - Day ${dayNum - 25}: ${[
      "Spring IoC Container and Dependency Injection concepts",
      "XML vs Annotation-based spring configuration",
      "Bean Lifecycle, Bean Scopes (Singleton, Prototype)",
      "Spring AOP (Aspect Oriented Programming) basics",
      "Spring MVC architecture flow overview"
    ][i - 25]}`;
  } else if (dayNum <= 35) {
    topics = `Spring Boot & RESTful APIs - Day ${dayNum - 30}: ${[
      "Spring Boot starter templates and Auto-configuration",
      "Building REST API endpoints with @RestController",
      "Request Handling (@PathVariable, @RequestParam, @RequestBody)",
      "Exception Handling in REST Controller (@ControllerAdvice)",
      "Spring Data JPA integrations with repositories"
    ][i - 30]}`;
  } else if (dayNum <= 40) {
    topics = `Frontend Integration & Web Dev - Day ${dayNum - 35}: ${[
      "HTML5, CSS3 styling with flexbox layouts",
      "Modern ES6 JavaScript (Promises, async/await, Fetch API)",
      "React.js introduction: Vite setup and Component state",
      "React Hooks: useState and useEffect API integrations",
      "Axios API client connecting to Spring Boot backend"
    ][i - 35]}`;
  } else {
    topics = `Full-Stack Capstone Project - Day ${dayNum - 40}: ${[
      "Project Design: E-Commerce REST Services planning",
      "Spring Security configuration with JWT authentication",
      "React routing, user login page and catalog page",
      "Checkout workflow, Cart context, database persistency",
      "Cloud deployment (AWS/Heroku), Resume Review & Mock Interviews"
    ][i - 40]}`;
    type = "Project";
  }

  // Adjust duration and practice sessions
  if (dayNum % 7 === 0) {
    topics = `PRACTICE CHALLENGE: Full-Stack Code Integration & Problem Solving`;
    type = "HackerRank Practice";
    duration = "1.00 Hours";
  }

  return { day: `Day ${dayNum}`, duration, topics, type };
});

// Syllabus Data for Python & DSA (62 days)
const pythonDsaSyllabus = Array.from({ length: 62 }, (_, i) => {
  const dayNum = i + 1;
  let topics = "";
  let type = "Theory/Lab";
  let duration = "1.25 Hours";

  if (dayNum <= 10) {
    topics = `Python Basics - Day ${dayNum}: ${[
      "Introduction, Setup, Variables & Data Types",
      "Operators, Expressions, and Type Casting",
      "Control Flow: If-else conditions, Nesting",
      "Loops: For and While statements, range()",
      "Functions: Arguments, Return Types, Recursion basics",
      "Lists: indexing, slicing, comprehensions",
      "Tuples and Sets: mutability, operations",
      "Dictionaries: key-value stores, methods",
      "String processing, Formatting, Built-in methods",
      "File Handling: opening, reading, writing files"
    ][i]}`;
  } else if (dayNum <= 20) {
    topics = `Object Oriented Python - Day ${dayNum - 10}: ${[
      "OOP Basics: Classes, Objects, __init__ method",
      "Encapsulation: private/protected variables, properties",
      "Inheritance: single, multiple, method resolution order",
      "Polymorphism: method overriding, dunder methods",
      "Exception Handling: try-except-finally blocks",
      "Modules, Packages, and virtual environments",
      "Decorators and Generators implementation",
      "Iterators and Itertools module usage",
      "Regular Expressions (re module) parsing",
      "Python standard libraries (math, datetime, os)"
    ][i - 10]}`;
  } else if (dayNum <= 30) {
    topics = `Data Structures (Linear) - Day ${dayNum - 20}: ${[
      "Analysis of Algorithms: Big O notation complexity",
      "Arrays & Dynamic Arrays implementation",
      "Singly Linked Lists: Creation, Insertion, Deletion",
      "Doubly Linked Lists: Reverse traversal, manipulation",
      "Circular Linked Lists and Josephus problem",
      "Stacks: Array and Linked List implementations",
      "Queues: FIFO structure, circular queue",
      "Double ended queue (Deque) usage in Python",
      "Hash Tables: Collisions, Chaining, probing",
      "LeetCode Problem Solving on Arrays & Lists"
    ][i - 20]}`;
  } else if (dayNum <= 40) {
    topics = `Algorithms (Sorting & Searching) - Day ${dayNum - 30}: ${[
      "Linear Search, Binary Search recursion",
      "Bubble Sort, Selection Sort implementation",
      "Insertion Sort, Shell Sort mechanics",
      "Merge Sort: Divide and Conquer paradigm",
      "Quick Sort: Pivot choices, partition schemes",
      "Heap Sort: Binary Heap implementation",
      "Radix and Counting Sort overview",
      "Recursion: Backtracking (N-Queens, Maze solver)",
      "Greedy Algorithms: Huffman coding, Knapsack",
      "Divide & Conquer optimization strategies"
    ][i - 30]}`;
  } else if (dayNum <= 50) {
    topics = `Advanced Data Structures (Non-linear) - Day ${dayNum - 40}: ${[
      "Binary Trees: Properties, Array/Pointer structures",
      "Tree Traversals: Preorder, Inorder, Postorder",
      "Binary Search Trees (BST): insertion, lookup, deletion",
      "Balanced Trees: AVL Trees rotation basics",
      "Priority Queues and Binary Heaps",
      "Graphs: Adjacency Matrix & Adjacency List",
      "Graph Traversals: Breadth-First Search (BFS)",
      "Graph Traversals: Depth-First Search (DFS)",
      "Single Source Shortest Path: Dijkstra's Algorithm",
      "Minimum Spanning Trees: Prim & Kruskal algorithms"
    ][i - 40]}`;
  } else if (dayNum <= 58) {
    topics = `Dynamic Programming & Advanced Concepts - Day ${dayNum - 50}: ${[
      "Dynamic Programming: Memoization vs Tabulation",
      "DP Challenges: Fibonacci, Coin Change problem",
      "DP Challenges: Longest Common Subsequence (LCS)",
      "DP Challenges: 0/1 Knapsack optimization",
      "Bit Manipulation algorithms and tricks",
      "Sliding Window and Two Pointer techniques",
      "Trie Data Structure for prefix searching",
      "Segment Trees for range query problems"
    ][i - 50]}`;
  } else {
    topics = `Capstone Project & Interview Prep - Day ${dayNum - 58}: ${[
      "System Design: Designing scalable algorithms",
      "Mock Interviews: Live whiteboard DSA coding",
      "Resume engineering for Data Science / Software engineering",
      "Final Project Presentation and code reviews"
    ][i - 58]}`;
    type = "Project";
  }

  // Adjust duration and practice sessions
  if (dayNum % 8 === 0) {
    topics = `PRACTICE CHALLENGE: HackerRank Coding Practice Challenge on DSA`;
    type = "HackerRank Practice";
    duration = "1.00 Hours";
  }

  return { day: `Day ${dayNum}`, duration, topics, type };
});

export default function ProgrammingCourses() {
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const [activeTrack, setActiveTrack] = useState('java-fundamentals');
  const [searchQuery, setSearchQuery] = useState('');

  const getSyllabusData = () => {
    switch (activeTrack) {
      case 'java-fundamentals':
        return javaFundamentalsSyllabus;
      case 'java-fullstack':
        return javaFullStackSyllabus;
      case 'python-dsa':
        return pythonDsaSyllabus;
      default:
        return javaFundamentalsSyllabus;
    }
  };

  const getTypeBadgeStyles = (type) => {
    switch (type) {
      case 'Theory/Lab':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'HackerRank Practice':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Project':
        return 'bg-purple-50 text-purple-600 border border-purple-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  const currentSyllabus = getSyllabusData();
  const filteredSyllabus = currentSyllabus.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.day.toLowerCase().includes(query) ||
      item.topics.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.duration.toLowerCase().includes(query)
    );
  });

  return (
    <main className="w-full relative z-10 pb-20 pt-4 lg:pb-24 max-w-[1200px] mx-auto px-6 flex flex-col gap-16 overflow-x-hidden">
      
      {/* Page Header */}
      <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-4 mt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-[#f36b2b] font-semibold text-sm w-fit border border-orange-100">
          Professional Programming Courses
        </div>
        <h1 className="text-[44px] md:text-[60px] font-[900] text-slate-900 leading-[1.1] tracking-tight">
          Enhance Your <span className="text-[#f36b2b]">Coding Skills</span>
        </h1>
        <p className="text-[18px] text-slate-500 leading-relaxed max-w-[650px]">
          Explore our signature interactive course deck. Hover over each card on desktop or tap on mobile to reveal detailed focus areas and syllabus highlights.
        </p>
      </section>

      {/* Accordion Panels Layout */}
      <section className="w-full flex flex-col lg:flex-row gap-6 h-auto lg:h-[530px] min-h-[530px]">
        {programmingCoursesData.map((course, idx) => {
          const isExpanded = hoveredIndex === idx;

          return (
            <motion.div
              key={idx}
              layout
              onMouseEnter={() => setHoveredIndex(idx)}
              className={`relative flex flex-col bg-white rounded-[32px] border transition-all duration-500 overflow-hidden cursor-pointer p-6 lg:p-7 ${
                isExpanded
                  ? 'flex-[3.0] border-orange-200/80 shadow-[0_20px_50px_rgba(243,107,43,0.08)]'
                  : 'flex-[0.6] border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)] hover:bg-slate-50/50'
              } h-[130px] lg:h-full`}
            >
              {/* Layout Content wrapper */}
              <div className="w-full h-full flex flex-col lg:flex-row gap-6 relative">
                
                {/* Collapsed state vertical layout (Desktop) / horizontal layout (Mobile) */}
                {!isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-4 lg:gap-8 w-full h-full"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      {course.svgIcon}
                    </div>
                    
                    {/* Vertically rotated title on desktop */}
                    <span className="hidden lg:block font-black text-slate-700 text-base uppercase tracking-wider text-center select-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      {course.title.split(" ")[0]} Course
                    </span>
                    
                    {/* Standard title on mobile */}
                    <span className="lg:hidden font-extrabold text-slate-800 text-[18px]">
                      {course.title}
                    </span>

                    <span className="text-slate-400 font-extrabold text-sm border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                  </motion.div>
                )}

                {/* Expanded State Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="w-full h-full flex flex-col justify-between"
                  >
                    {/* Top Row: Icon & Tag Badge */}
                    <div className="flex items-center justify-between w-full mb-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                        {course.svgIcon}
                      </div>
                      <span className={`px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${course.tagBg}`}>
                        {course.tag}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h2 className="text-slate-900 font-[900] text-[22px] lg:text-[26px] tracking-tight mb-2 leading-tight">
                        {course.title}
                      </h2>
                      <p className="text-slate-500 text-[13px] lg:text-[14.5px] leading-relaxed mb-3.5 font-medium max-w-[650px]">
                        {course.desc}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 w-full my-1" />

                    {/* Focus Areas grid */}
                    <div className="mb-3.5">
                      <h3 className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-2">
                        KEY FOCUS AREAS
                      </h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                        {course.focusAreas.map((area, focusIdx) => (
                          <li key={focusIdx} className="flex items-center gap-3.5 text-slate-700">
                            <CheckCircle2 size={16} className="text-[#f36b2b] flex-shrink-0" />
                            <span className="text-[13px] font-bold tracking-wide">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Enroll CTA Button */}
                    <div className="pt-2 border-t border-slate-100">
                      <button className="w-full sm:w-fit py-3 px-8 rounded-xl bg-gradient-to-r from-[#f36b2b] to-orange-500 hover:shadow-[0_8px_25px_rgba(243,107,43,0.25)] text-white flex items-center justify-center gap-2 transition-all duration-300 font-bold text-sm tracking-wide cursor-pointer hover:scale-[1.02]">
                        <span>Enroll in {course.title.split(" ")[0]}</span>
                      </button>
                    </div>

                  </motion.div>
                )}

              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Curriculum & Syllabus Blueprints Section */}
      <section className="w-full flex flex-col gap-8 pt-10 border-t border-slate-100">
        
        {/* Section Header */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-[#f36b2b] font-semibold text-sm w-fit border border-orange-100">
            <BookOpen size={16} />
            Syllabus Curriculums
          </div>
          <h2 className="text-[32px] md:text-[40px] font-[900] text-slate-900 leading-tight tracking-tight">
            Curriculum & <span className="text-[#f36b2b]">Syllabus Blueprints</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl font-medium">
            Review Day-by-Day training schedules. Select a track tab and type to search topics.
          </p>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
          {/* Tab buttons */}
          <div className="flex flex-wrap gap-2.5">
            {[
              { id: 'java-fundamentals', label: '25-Day Java Fundamentals' },
              { id: 'java-fullstack', label: '45-Day Java Full-Stack' },
              { id: 'python-dsa', label: '62-Day Python & DSA' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTrack(tab.id);
                  setSearchQuery('');
                }}
                className={`py-3 px-5 rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all duration-300 border cursor-pointer ${
                  activeTrack === tab.id
                    ? 'bg-gradient-to-r from-[#f36b2b] to-orange-500 text-white border-transparent shadow-[0_5px_15px_rgba(243,107,43,0.15)]'
                    : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-grow lg:max-w-xs">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search topics or days..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-[14px] font-medium placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all duration-300"
            />
          </div>
        </div>

        {/* Syllabus Table Container */}
        <div className="w-full bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.015)]">
          <div 
            className="max-h-[480px] overflow-y-auto pr-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(243, 107, 43, 0.2) transparent'
            }}
          >
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 w-[15%]">
                    Day
                  </th>
                  <th className="px-6 py-4.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 w-[15%]">
                    Duration
                  </th>
                  <th className="px-6 py-4.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 w-[50%]">
                    Topics Covered
                  </th>
                  <th className="px-6 py-4.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 w-[20%]">
                    Session Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSyllabus.length > 0 ? (
                  filteredSyllabus.map((row, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 text-[14px] font-extrabold text-slate-900 whitespace-nowrap">
                        {row.day}
                      </td>
                      <td className="px-6 py-4 text-[14px] font-bold text-[#f36b2b]">
                        {row.duration}
                      </td>
                      <td className="px-6 py-4 text-[14.5px] font-semibold text-slate-600 leading-relaxed">
                        {row.topics}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${getTypeBadgeStyles(row.type)}`}>
                          {row.type}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-semibold text-sm">
                      No matching syllabus topics found. Try searching for another keyword.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </section>
      
    </main>
  );
}
