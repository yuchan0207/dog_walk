def solution(num:int):
    ans = ""
    bb = ""
    cc = ""
    a = num
    b = num
    c = num
    k = 0
    while num > 0:
        ans = str(num % 2) + ans
        a //= 2
        bb = str(num % 4) + bb
        b//=4
        cc = str(num % 8) + cc
        c //= 8
        if ans == ans[::-1] and bb == bb[::-1] and cc == cc[::-1]:
            k = num