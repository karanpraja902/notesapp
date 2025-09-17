# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Sign in to your account" [level=2] [ref=e5]
      - paragraph [ref=e6]:
        - text: Or
        - link "create a new organization" [ref=e7] [cursor=pointer]:
          - /url: /signup
    - generic [ref=e8]:
      - generic [ref=e9]:
        - textbox "Email address" [ref=e11]
        - textbox "Password" [ref=e13]
      - button "Sign in" [ref=e15]
      - generic [ref=e16]:
        - generic [ref=e17]: "Test Accounts (password: password):"
        - generic [ref=e18]:
          - button "admin@acme.test" [ref=e19]
          - button "user@acme.test" [ref=e20]
          - button "admin@globex.test" [ref=e21]
          - button "user@globex.test" [ref=e22]
  - button "Open Next.js Dev Tools" [ref=e28] [cursor=pointer]:
    - img [ref=e29] [cursor=pointer]
  - alert [ref=e32]
```