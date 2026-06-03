"""
Cryptographic Analysis Module
Purpose: Analyze entropy, randomness, and performance metrics
Implements NIST SP 800-22 inspired statistical tests
"""

import math
import hashlib
from typing import Dict, Tuple, List
import time
from collections import Counter

class EntropyAnalyzer:
    """
    Analyze entropy and randomness of generated keys
    """
    
    @staticmethod
    def shannon_entropy(data: bytes) -> float:
        """
        Calculate Shannon entropy of data
        Higher entropy = more random
        
        Args:
            data: Input data
            
        Returns:
            Shannon entropy value (0-8 for bytes)
        """
        if len(data) == 0:
            return 0.0
        
        byte_counts = Counter(data)
        entropy = 0.0
        
        for count in byte_counts.values():
            probability = count / len(data)
            entropy -= probability * math.log2(probability)
        
        return entropy
    
    @staticmethod
    def frequency_test(data: bytes) -> Dict:
        """
        Frequency test for randomness
        Counts distribution of byte values
        
        Args:
            data: Input data
            
        Returns:
            Test results dictionary
        """
        byte_counts = Counter(data)
        expected_count = len(data) / 256
        
        chi_squared = 0.0
        for i in range(256):
            observed = byte_counts.get(i, 0)
            chi_squared += ((observed - expected_count) ** 2) / expected_count
        
        # Chi-squared critical value for 255 degrees of freedom at 0.05 significance
        critical_value = 293.25
        is_random = chi_squared < critical_value
        
        return {
            'chi_squared': chi_squared,
            'critical_value': critical_value,
            'is_random': is_random,
            'test': 'frequency_test'
        }
    
    @staticmethod
    def runs_test(data: bytes) -> Dict:
        """
        Runs test for randomness
        Analyzes sequences of same values
        
        Args:
            data: Input data
            
        Returns:
            Test results dictionary
        """
        if len(data) < 8:
            return {'error': 'Insufficient data for runs test'}
        
        # Convert bytes to binary representation
        bits = bin(int.from_bytes(data, 'big'))[2:].zfill(len(data) * 8)
        
        runs = 1
        for i in range(1, len(bits)):
            if bits[i] != bits[i-1]:
                runs += 1
        
        n = len(bits)
        expected_runs = 2 * sum(Counter(bits).values()) / n
        variance = 2 * sum(Counter(bits).values()) * (n - sum(Counter(bits).values())) / (n ** 2 * (n - 1))
        
        if variance == 0:
            z_score = 0
        else:
            z_score = abs((runs - expected_runs) / math.sqrt(variance))
        
        is_random = z_score < 1.96  # 95% confidence level
        
        return {
            'runs': runs,
            'expected_runs': expected_runs,
            'z_score': z_score,
            'is_random': is_random,
            'test': 'runs_test'
        }
    
    @staticmethod
    def autocorrelation_test(data: bytes, lag: int = 1) -> Dict:
        """
        Autocorrelation test
        Checks if data correlates with itself at given lag
        
        Args:
            data: Input data
            lag: Lag value for autocorrelation
            
        Returns:
            Test results dictionary
        """
        n = len(data)
        if lag >= n:
            return {'error': 'Lag too large for data length'}
        
        mean = sum(data) / n
        variance = sum((x - mean) ** 2 for x in data) / n
        
        if variance == 0:
            autocorr = 0
        else:
            autocorr = sum((data[i] - mean) * (data[i + lag] - mean) 
                          for i in range(n - lag)) / ((n - lag) * variance)
        
        # Critical value at 95% confidence
        critical_value = 1.96 / math.sqrt(n)
        
        is_random = abs(autocorr) < critical_value
        
        return {
            'autocorrelation': autocorr,
            'critical_value': critical_value,
            'is_random': is_random,
            'lag': lag,
            'test': 'autocorrelation_test'
        }
    
    @staticmethod
    def coupon_collector_test(data: bytes, m: int = 256) -> Dict:
        """
        Coupon collector test
        Analyzes distribution of unique values
        
        Args:
            data: Input data
            m: Number of possible values (default: 256 for bytes)
            
        Returns:
            Test results dictionary
        """
        n = len(data)
        unique_values = len(set(data))
        
        # Expected value for coupon collector problem
        expected_unique = m * (1 - (1 - 1/m) ** n)
        
        # Chi-squared approximation
        observed = unique_values
        expected = expected_unique
        
        chi_squared = ((observed - expected) ** 2) / expected if expected > 0 else 0
        
        return {
            'unique_values': unique_values,
            'expected_unique': expected_unique,
            'chi_squared': chi_squared,
            'test': 'coupon_collector_test'
        }
    
    @staticmethod
    def calculate_min_entropy(data: bytes) -> float:
        """
        Calculate min-entropy (Renyi entropy of order infinity)
        Minimum entropy = -log2(max_probability)
        
        Args:
            data: Input data
            
        Returns:
            Min-entropy value
        """
        if len(data) == 0:
            return 0.0
        
        byte_counts = Counter(data)
        max_count = max(byte_counts.values())
        max_probability = max_count / len(data)
        
        if max_probability == 0:
            return 0.0
        
        return -math.log2(max_probability)
    
    @staticmethod
    def calculate_collision_entropy(data: bytes) -> float:
        """
        Calculate collision entropy (Renyi entropy of order 2)
        
        Args:
            data: Input data
            
        Returns:
            Collision entropy value
        """
        if len(data) == 0:
            return 0.0
        
        byte_counts = Counter(data)
        n = len(data)
        
        sum_prob_squared = sum((count / n) ** 2 for count in byte_counts.values())
        
        if sum_prob_squared == 0:
            return 0.0
        
        return -math.log2(sum_prob_squared)
    
    @classmethod
    def comprehensive_analysis(cls, data: bytes) -> Dict:
        """
        Perform comprehensive randomness analysis
        
        Args:
            data: Input data to analyze
            
        Returns:
            Comprehensive analysis results
        """
        return {
            'data_length': len(data),
            'shannon_entropy': cls.shannon_entropy(data),
            'min_entropy': cls.calculate_min_entropy(data),
            'collision_entropy': cls.calculate_collision_entropy(data),
            'frequency_test': cls.frequency_test(data),
            'runs_test': cls.runs_test(data),
            'autocorrelation_test': cls.autocorrelation_test(data),
            'coupon_collector_test': cls.coupon_collector_test(data)
        }


class PerformanceAnalyzer:
    """
    Analyze performance metrics of cryptographic operations
    """
    
    @staticmethod
    def measure_execution_time(operation, *args, **kwargs) -> Tuple[any, float]:
        """
        Measure execution time of operation
        
        Args:
            operation: Function to measure
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function
            
        Returns:
            Tuple of (result, execution_time_ms)
        """
        start_time = time.perf_counter()
        result = operation(*args, **kwargs)
        end_time = time.perf_counter()
        
        execution_time_ms = (end_time - start_time) * 1000
        
        return result, execution_time_ms
    
    @staticmethod
    def benchmark_encryption(cipher_func, key: bytes, plaintext: bytes, 
                            iterations: int = 1000) -> Dict:
        """
        Benchmark encryption function
        
        Args:
            cipher_func: Encryption function
            key: Encryption key
            plaintext: Plaintext to encrypt
            iterations: Number of iterations
            
        Returns:
            Benchmark results
        """
        total_time = 0.0
        
        for _ in range(iterations):
            _, exec_time = PerformanceAnalyzer.measure_execution_time(
                cipher_func, key, plaintext
            )
            total_time += exec_time
        
        avg_time = total_time / iterations
        throughput = (len(plaintext) / 1024) / (avg_time / 1000)  # KB/s
        
        return {
            'total_time_ms': total_time,
            'avg_time_ms': avg_time,
            'throughput_kbs': throughput,
            'iterations': iterations
        }
    
    @staticmethod
    def compare_algorithms(algorithms: Dict, key: bytes, 
                          plaintext: bytes, iterations: int = 100) -> Dict:
        """
        Compare performance of multiple algorithms
        
        Args:
            algorithms: Dictionary of {name: function}
            key: Encryption key
            plaintext: Plaintext
            iterations: Number of iterations
            
        Returns:
            Comparison results
        """
        results = {}
        
        for name, func in algorithms.items():
            try:
                benchmark = PerformanceAnalyzer.benchmark_encryption(
                    func, key, plaintext, iterations
                )
                results[name] = benchmark
            except Exception as e:
                results[name] = {'error': str(e)}
        
        return results
    
    @staticmethod
    def analyze_memory_usage(data_size: int) -> Dict:
        """
        Analyze estimated memory usage (simulation)
        
        Args:
            data_size: Size of data in bytes
            
        Returns:
            Memory usage estimates
        """
        # Simulated memory usage estimates
        state_size = 40  # ASCON state
        round_key_size = 176  # AES round keys (11 * 16)
        
        return {
            'input_data_bytes': data_size,
            'ascon_estimated_bytes': state_size + data_size,
            'aes_estimated_bytes': round_key_size + data_size,
            'speck_estimated_bytes': 100 + data_size,
            'total_estimated_kb': (state_size + data_size) / 1024
        }


class AlgorithmComparator:
    """
    Compare cryptographic algorithms
    """
    
    @staticmethod
    def create_comparison_table(algorithms_results: Dict) -> List[Dict]:
        """
        Create comparison table from algorithm results
        
        Args:
            algorithms_results: Dictionary of algorithm results
            
        Returns:
            Formatted comparison table
        """
        table = []
        
        for algo_name, results in algorithms_results.items():
            row = {
                'algorithm': algo_name,
                'avg_time_ms': results.get('avg_time_ms', 0),
                'throughput_kbs': results.get('throughput_kbs', 0),
                'iterations': results.get('iterations', 0)
            }
            table.append(row)
        
        return table
    
    @staticmethod
    def rank_algorithms(algorithms_results: Dict, metric: str = 'throughput_kbs') -> List[Tuple]:
        """
        Rank algorithms by specified metric
        
        Args:
            algorithms_results: Dictionary of algorithm results
            metric: Metric to rank by
            
        Returns:
            Ranked list of (algorithm_name, metric_value)
        """
        rankings = []
        
        for algo_name, results in algorithms_results.items():
            if metric in results and 'error' not in results:
                value = results[metric]
                rankings.append((algo_name, value))
        
        # Sort by value (descending for throughput, ascending for time)
        reverse = metric == 'throughput_kbs'
        rankings.sort(key=lambda x: x[1], reverse=reverse)
        
        return rankings
