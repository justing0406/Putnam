PRAGMA foreign_keys = ON;

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  area TEXT NOT NULL DEFAULT 'Mixed',
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE problem_topics (
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, topic_id)
);

CREATE INDEX idx_problem_topics_topic ON problem_topics(topic_id);

INSERT OR IGNORE INTO topics (id, name, area, description, created_at) VALUES
  ('topic-algebra-radicals', 'Radical expressions', 'Algebra', 'Expressions involving square roots and higher radicals.', CURRENT_TIMESTAMP),
  ('topic-algebra-irrationality', 'Irrationality and rationality', 'Algebra', 'Proving that numbers or expressions are rational or irrational.', CURRENT_TIMESTAMP),
  ('topic-algebra-algebraic-numbers', 'Algebraic numbers', 'Algebra', 'Numbers satisfying polynomial equations with rational or integer coefficients.', CURRENT_TIMESTAMP),
  ('topic-algebra-polynomials', 'Polynomials', 'Algebra', 'Polynomial identities, roots, coefficients, and divisibility.', CURRENT_TIMESTAMP),
  ('topic-algebra-polynomial-roots', 'Polynomial roots', 'Algebra', 'Location, multiplicity, and relations among roots.', CURRENT_TIMESTAMP),
  ('topic-algebra-inequalities', 'Algebraic inequalities', 'Algebra', 'Inequalities involving algebraic expressions.', CURRENT_TIMESTAMP),
  ('topic-algebra-functional-equations', 'Functional equations', 'Algebra', 'Equations whose unknowns are functions.', CURRENT_TIMESTAMP),
  ('topic-algebra-sequences', 'Algebraic sequences and recurrences', 'Algebra', 'Sequences defined by formulas or recurrence relations.', CURRENT_TIMESTAMP),
  ('topic-algebra-linear-algebra', 'Linear algebra', 'Algebra', 'Vector spaces, matrices, linear maps, eigenvalues, and determinants.', CURRENT_TIMESTAMP),
  ('topic-algebra-complex', 'Complex numbers', 'Algebra', 'Algebra and geometry of complex numbers.', CURRENT_TIMESTAMP),
  ('topic-algebra-symmetric', 'Symmetric expressions', 'Algebra', 'Expressions invariant under permutations of variables.', CURRENT_TIMESTAMP),
  ('topic-algebra-identities', 'Algebraic identities', 'Algebra', 'Exact identities and transformations of algebraic expressions.', CURRENT_TIMESTAMP),

  ('topic-analysis-limits', 'Limits', 'Analysis', 'Limits of sequences, functions, and expressions.', CURRENT_TIMESTAMP),
  ('topic-analysis-continuity', 'Continuity', 'Analysis', 'Continuous functions and consequences such as the intermediate value theorem.', CURRENT_TIMESTAMP),
  ('topic-analysis-differentiation', 'Differentiation', 'Analysis', 'Derivatives, mean value theorems, and local behavior.', CURRENT_TIMESTAMP),
  ('topic-analysis-integration', 'Integration', 'Analysis', 'Definite integrals, integral estimates, and change of variables.', CURRENT_TIMESTAMP),
  ('topic-analysis-series', 'Infinite series', 'Analysis', 'Convergence and evaluation of infinite sums.', CURRENT_TIMESTAMP),
  ('topic-analysis-sequences', 'Sequences of real numbers', 'Analysis', 'Convergence, subsequences, and asymptotic behavior.', CURRENT_TIMESTAMP),
  ('topic-analysis-convexity', 'Convexity', 'Analysis', 'Convex functions, sets, and inequalities.', CURRENT_TIMESTAMP),
  ('topic-analysis-compactness', 'Compactness', 'Analysis', 'Compact sets, subsequences, and finite-subcover arguments.', CURRENT_TIMESTAMP),
  ('topic-analysis-approximation', 'Approximation and estimation', 'Analysis', 'Quantitative bounds and asymptotic estimates.', CURRENT_TIMESTAMP),

  ('topic-comb-counting', 'Basic counting', 'Combinatorics', 'Counting finite configurations and arrangements.', CURRENT_TIMESTAMP),
  ('topic-comb-permutations', 'Permutations and combinations', 'Combinatorics', 'Selections, orderings, and arrangements.', CURRENT_TIMESTAMP),
  ('topic-comb-set-systems', 'Set systems', 'Combinatorics', 'Families of sets and intersection or containment properties.', CURRENT_TIMESTAMP),
  ('topic-comb-graph-theory', 'Graph theory', 'Combinatorics', 'Vertices, edges, paths, cycles, trees, and connectivity.', CURRENT_TIMESTAMP),
  ('topic-comb-extremal', 'Extremal combinatorics', 'Combinatorics', 'Maximum or minimum sizes under structural restrictions.', CURRENT_TIMESTAMP),
  ('topic-comb-enumerative', 'Enumerative combinatorics', 'Combinatorics', 'Exact enumeration of structured objects.', CURRENT_TIMESTAMP),
  ('topic-comb-probability', 'Discrete probability', 'Combinatorics', 'Probability on finite or countable sample spaces.', CURRENT_TIMESTAMP),
  ('topic-comb-random-processes', 'Random processes', 'Combinatorics', 'Random walks, stopping rules, and evolving random systems.', CURRENT_TIMESTAMP),
  ('topic-comb-games', 'Combinatorial games', 'Combinatorics', 'Finite games, winning strategies, and game states.', CURRENT_TIMESTAMP),
  ('topic-comb-tilings', 'Tilings and coverings', 'Combinatorics', 'Tiling, packing, covering, and board problems.', CURRENT_TIMESTAMP),
  ('topic-comb-partitions', 'Integer and set partitions', 'Combinatorics', 'Partitions of integers or finite sets.', CURRENT_TIMESTAMP),

  ('topic-geometry-euclidean', 'Euclidean geometry', 'Geometry', 'Classical geometry of points, lines, circles, and polygons.', CURRENT_TIMESTAMP),
  ('topic-geometry-triangles', 'Triangles and circles', 'Geometry', 'Triangle centers, cyclic configurations, and circle geometry.', CURRENT_TIMESTAMP),
  ('topic-geometry-coordinate', 'Coordinate geometry', 'Geometry', 'Geometric problems represented with coordinates and equations.', CURRENT_TIMESTAMP),
  ('topic-geometry-transformations', 'Geometric transformations', 'Geometry', 'Reflections, rotations, translations, homotheties, and inversions.', CURRENT_TIMESTAMP),
  ('topic-geometry-convex', 'Convex geometry', 'Geometry', 'Convex sets, polygons, hulls, and separation properties.', CURRENT_TIMESTAMP),
  ('topic-geometry-solid', 'Solid geometry', 'Geometry', 'Three-dimensional figures, volumes, and spatial configurations.', CURRENT_TIMESTAMP),
  ('topic-geometry-loci', 'Loci and configurations', 'Geometry', 'Sets of points satisfying geometric conditions.', CURRENT_TIMESTAMP),

  ('topic-nt-divisibility', 'Divisibility', 'Number Theory', 'Divisors, greatest common divisors, and divisibility relations.', CURRENT_TIMESTAMP),
  ('topic-nt-primes', 'Prime numbers', 'Number Theory', 'Prime factorization and properties of primes.', CURRENT_TIMESTAMP),
  ('topic-nt-congruences', 'Congruences', 'Number Theory', 'Arithmetic modulo an integer.', CURRENT_TIMESTAMP),
  ('topic-nt-diophantine', 'Diophantine equations', 'Number Theory', 'Equations requiring integer or rational solutions.', CURRENT_TIMESTAMP),
  ('topic-nt-quadratic-residues', 'Quadratic residues', 'Number Theory', 'Squares modulo integers and related reciprocity phenomena.', CURRENT_TIMESTAMP),
  ('topic-nt-arithmetic-functions', 'Arithmetic functions', 'Number Theory', 'Functions such as phi, divisor sums, and multiplicative functions.', CURRENT_TIMESTAMP),
  ('topic-nt-orders', 'Orders modulo n', 'Number Theory', 'Multiplicative orders and cyclic behavior modulo integers.', CURRENT_TIMESTAMP),
  ('topic-nt-valuations', 'Prime valuations', 'Number Theory', 'Powers of primes dividing integers and rational expressions.', CURRENT_TIMESTAMP),
  ('topic-nt-pell', 'Pell-type equations', 'Number Theory', 'Quadratic Diophantine equations related to Pell equations.', CURRENT_TIMESTAMP),
  ('topic-nt-digits', 'Digit and base representations', 'Number Theory', 'Properties of decimal or other-base expansions.', CURRENT_TIMESTAMP),

  ('topic-mixed-logic', 'Mathematical logic', 'Mixed', 'Logical structure, quantifiers, and formal implications.', CURRENT_TIMESTAMP),
  ('topic-mixed-sets', 'Sets and relations', 'Mixed', 'Abstract sets, mappings, equivalence relations, and order relations.', CURRENT_TIMESTAMP),
  ('topic-mixed-algorithms', 'Algorithms and processes', 'Mixed', 'Iterative procedures, termination, and state evolution.', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO techniques (id, name, category, description, created_at) VALUES
  ('tech-radical-isolation', 'Radical isolation and squaring', 'Algebra', 'Isolate radical terms and square strategically while controlling introduced terms.', CURRENT_TIMESTAMP),
  ('tech-algebraic-conjugation', 'Algebraic conjugation', 'Algebra', 'Use conjugate expressions or sign changes of radicals to eliminate terms.', CURRENT_TIMESTAMP),
  ('tech-minimal-polynomial', 'Minimal polynomial construction', 'Algebra', 'Construct a polynomial equation satisfied by an algebraic expression.', CURRENT_TIMESTAMP),
  ('tech-linear-independence-radicals', 'Linear independence of radicals', 'Algebra', 'Show distinct square-root terms cannot combine to produce a rational relation.', CURRENT_TIMESTAMP),
  ('tech-rationality-contradiction', 'Rationality contradiction', 'Algebra', 'Assume an expression is rational and derive an impossible rationality consequence.', CURRENT_TIMESTAMP);