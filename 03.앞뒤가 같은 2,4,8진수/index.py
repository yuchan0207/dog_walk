def solution(n):
    a = 0
    for i in n:
        b = i - 1
        a = i + b
    return a
print(solution(7))