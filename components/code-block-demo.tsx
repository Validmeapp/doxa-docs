import { CodeBlock } from './code-block';

export function CodeBlockDemo() {
  const jsCode = `function greetUser(name) {
  if (!name) {
    throw new Error('Name is required');
  }
  
  return \`Hello, \${name}! Welcome to our docs.\`;
}

// Usage example
const greeting = greetUser('Developer');
console.log(greeting);`;

  const tsCode = `interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

class UserService {
  private users: User[] = [];

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...userData,
      createdAt: new Date(),
    };
    
    this.users.push(user);
    return user;
  }
}`;

  const curlCode = `curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'`;

  const responseCode = `{
  "id": "user_123456789",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "status": "active"
}`;

  const tabsExample = [
    { label: 'cURL', code: curlCode, language: 'bash' },
    { label: 'Response', code: responseCode, language: 'json' },
  ];

  const multiLanguageExample = [
    { 
      label: 'JavaScript', 
      code: `const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
});

const user = await response.json();
console.log(user);`, 
      language: 'javascript' 
    },
    { 
      label: 'Python', 
      code: `import requests

url = 'https://api.example.com/users'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
}
data = {
    'name': 'John Doe',
    'email': 'john@example.com'
}

response = requests.post(url, json=data, headers=headers)
user = response.json()
print(user)`, 
      language: 'python' 
    },
    { 
      label: 'Go', 
      code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type User struct {
    Name  string \`json:"name"\`
    Email string \`json:"email"\`
}

func main() {
    user := User{
        Name:  "John Doe",
        Email: "john@example.com",
    }
    
    jsonData, _ := json.Marshal(user)
    
    req, _ := http.NewRequest("POST", "https://api.example.com/users", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
    
    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
    
    fmt.Println("User created successfully")
}`, 
      language: 'go' 
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold">Code Block Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-lg font-semibold">JavaScript Example</h3>
            <CodeBlock
              code={jsCode}
              language="javascript"
              filename="greet.js"
              highlightLines={[2, 3, 4]}
            />
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">TypeScript Example</h3>
            <CodeBlock
              code={tsCode}
              language="typescript"
              filename="user-service.ts"
            />
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">API Request/Response Example</h3>
            <CodeBlock
              code=""
              language=""
              tabs={tabsExample}
              filename="create-user-api.md"
            />
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Multi-Language SDK Examples</h3>
            <CodeBlock
              code=""
              language=""
              tabs={multiLanguageExample}
              filename="sdk-examples"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeBlockDemo;