---
name: Security vulnerability report
about: Report a security issue (please use this template for security issues only)
title: '[SECURITY] '
labels: 'security'
assignees: ''
---

**⚠️ IMPORTANT: Security Issues**

If this is a security vulnerability that could be exploited, please consider reporting it privately first:
- Email: security@lume-app.com (if available)
- Create a private security advisory on GitHub
- Contact maintainers directly

**Only use this public template for:**
- Security improvements or hardening suggestions
- Security-related questions
- Non-exploitable security concerns

---

**Security Issue Type**
Please select the type of security issue:
- [ ] Data Privacy (unauthorized data access or leakage)
- [ ] Code Injection (potential for malicious code execution)
- [ ] File System Access (unauthorized file read/write)
- [ ] Network Security (insecure communications)
- [ ] Dependency Vulnerability (known CVE in dependencies)
- [ ] Privilege Escalation (gaining unauthorized permissions)
- [ ] Other (please specify)

**Severity Level**
- [ ] Critical - Immediate threat, potential for significant harm
- [ ] High - Serious security flaw that should be addressed quickly
- [ ] Medium - Security issue that should be addressed
- [ ] Low - Minor security improvement or hardening suggestion

**Affected Components**
Which parts of Lume are affected?
- [ ] Activity Monitoring (data collection)
- [ ] Database Storage (SQLite operations)
- [ ] File System Operations (settings, exports)
- [ ] Electron Main Process
- [ ] Renderer Process (UI)
- [ ] IPC Communication
- [ ] External Dependencies

**Description**
A clear and concise description of the security issue.

**Potential Impact**
What could an attacker potentially accomplish? What data or functionality could be compromised?

**Steps to Reproduce (if applicable)**
If this is an exploitable vulnerability, provide general steps (avoid detailed exploitation instructions):
1. Go to '...'
2. Perform action '...'
3. Observe security issue

**Environment**
- OS: [e.g. macOS 13.0, Windows 11, Ubuntu 22.04]
- Lume Version: [e.g. 1.0.0]
- Node.js Version: [e.g. 18.17.0]
- Electron Version: [e.g. 29.0.0]

**Suggested Mitigation**
If you have suggestions for how to address this security issue:

**Additional Context**
Add any other context about the security issue here.

**Checklist**
- [ ] I have verified this is a security-related issue
- [ ] I understand the severity and potential impact
- [ ] I have not included detailed exploitation instructions
- [ ] I am willing to work with maintainers to resolve this issue

**Confidentiality**
- [ ] This issue can be discussed publicly
- [ ] This issue should be handled privately until resolved
- [ ] I need guidance on the appropriate disclosure process