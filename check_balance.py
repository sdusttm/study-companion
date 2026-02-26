import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    braces = 0
    parens = 0
    brackets = 0
    
    for i, char in enumerate(content):
        if char == '{': braces += 1
        elif char == '}': braces -= 1
        elif char == '(': parens += 1
        elif char == ')': parens -= 1
        elif char == '[': brackets += 1
        elif char == ']': brackets -= 1
        
        if braces < 0 or parens < 0 or brackets < 0:
            print(f"Error: Negative balance at index {i} ('{char}')")
            # Print some context
            start = max(0, i - 50)
            end = min(len(content), i + 50)
            print(f"Context: ...{content[start:end]}...")
            return

    print(f"Final balance: Braces={braces}, Parens={parens}, Brackets={brackets}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
