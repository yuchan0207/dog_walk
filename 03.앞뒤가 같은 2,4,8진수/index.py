def is_prime(n):
    for i in range(2,n):
        if n % i == 0:
            return False
    return True

def prime_number(n):
    ans = []
    for j in range(2, n+1):
        if is_prime(j):
            ans.append(j)
    return ans