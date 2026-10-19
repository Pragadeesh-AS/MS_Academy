import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";

const syllabusData = [
  {
    section: "Section 1: Calculus",
    topics: "Finite, countable and uncountable sets; Real number system as a complete ordered field, Archimedean property, supremum, infimum; Sequences and series, convergence; Limits, continuity, uniform continuity, differentiability; Mean value theorems, Taylor's theorem; Maxima and minima; Riemann integration, Fundamental theorem of calculus, Improper integrals; Functions of several variables, partial derivatives, multiple integrals."
  },
  {
    section: "Section 2: Matrix Theory & Linear Algebra",
    topics: "Subspaces of R^n, vector spaces, basis, dimension; Linear transformations, matrix representation, range space, null space, rank-nullity theorem; Systems of linear equations; Eigenvalues and eigenvectors, Cayley-Hamilton theorem; Symmetric, skew-symmetric, orthogonal, Hermitian and unitary matrices; Quadratic forms, positive definiteness."
  },
  {
    section: "Section 3: Probability",
    topics: "Axiomatic definition of probability, properties of probability function, conditional probability, Bayes theorem, independence of events; Random variables, cumulative distribution function, probability mass function, probability density function; Mathematical expectation, moments, moment generating function, characteristic function; Markov and Chebyshev inequalities, Weak and Strong laws of large numbers, Central limit theorem."
  },
  {
    section: "Section 4: Standard Distributions & Stochastic Processes",
    topics: "Bernoulli, Binomial, Poisson, Geometric, Negative Binomial, Hypergeometric, Uniform, Exponential, Normal, Gamma, Beta, Cauchy, Lognormal distributions; Chi-square, t, and F distributions; Joint, marginal and conditional distributions; Markov chains with finite and countable state space, transition probability matrix, classification of states, stationary distributions, Poisson process."
  },
  {
    section: "Section 5: Estimation Theory",
    topics: "Unbiasedness, consistency, efficiency of estimators; Sufficiency, Neyman factorization theorem, minimal sufficiency, completeness; Rao-Blackwell theorem, Lehmann-Scheffe theorem, Cramer-Rao lower bound, minimum variance unbiased estimators (MVUE); Method of moments, maximum likelihood estimation (MLE), confidence intervals."
  },
  {
    section: "Section 6: Testing of Hypotheses & Non-Parametric Tests",
    topics: "Null and alternative hypotheses, Type I and Type II errors, power function, size and level of significance; Most powerful and uniformly most powerful tests, Neyman-Pearson lemma; Likelihood ratio tests; Tests for parameters of normal populations; Goodness of fit tests, contingency tables; Non-parametric tests: Sign test, Wilcoxon signed rank test, Mann-Whitney U test, Kolmogorov-Smirnov test."
  },
  {
    section: "Section 7: Multivariate & Regression Analysis",
    topics: "Multivariate normal distribution, marginal and conditional distributions; Wishart distribution, Hotelling's T^2, Mahalanobis D^2; Principal component analysis; Simple and multiple linear regression models, least squares estimation, Gauss-Markov theorem, coefficient of determination, residual analysis, multicollinearity, test for significance of regression."
  }
];

export default function StCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[34px] sm:text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Statistics</span> (ST)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master calculus, linear algebra, probability theory, standard distributions, statistical inference, hypothesis testing, stochastic processes, and multivariate regression with our comprehensive GATE ST coaching program.
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            <ShinyButton className="px-6 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-[17px] font-semibold text-white rounded-xl bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02] transition-transform border border-[#333333]">
              Enroll Now
            </ShinyButton>
            <button className="px-6 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-[17px] font-semibold text-slate-700 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
              Download Syllabus
            </button>
          </div>
        </div>

        {/* Right Side: Video / Visual */}
        <div className="flex-1 w-full max-w-[650px] flex justify-center items-center lg:pl-10">
          <video 
            src="/AIDS.mp4" 
            poster="/posters/AIDS.jpg"
            preload="auto"
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-auto rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100/60 hover:scale-[1.01] transition-transform duration-500"
          />
        </div>
      </section>

      {/* Detailed Syllabus Section */}
      <section className="w-full max-w-[1000px] mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-[14px] md:text-[16px] font-bold text-[#1d4ed8] tracking-widest uppercase mb-3">Complete Syllabus</h2>
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Statistics (ST)</h1>
          <p className="mt-4 text-[16px] text-slate-500 max-w-[700px] mx-auto leading-relaxed">
            Comprehensive curriculum aligned with official GATE examination standards covering mathematical foundations and core statistical methodologies.
          </p>
        </div>
        
        <div className="flex flex-col gap-6">
          {syllabusData.map((item, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex-shrink-0">
                  <CheckCircle2 className="text-[#1d4ed8] group-hover:scale-110 transition-transform" size={24} />
                </div>
                <div>
                  <h3 className="text-[20px] md:text-[22px] font-bold text-slate-900 mb-3">{item.section}</h3>
                  <p className="text-[16px] text-slate-600 leading-relaxed font-medium">
                    {item.topics}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
