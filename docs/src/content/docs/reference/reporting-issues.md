---
title: Reporting Issues and Feedback
description: Report a problem with Doodle Engine and share your feedback with me.
---

Making a game brings a lot of creative and technical pieces together. Doodle Engine is under active development, so if you run into a bug, I would love to hear about it. Your reports help make Doodle Engine better for everyone, and your feedback and ideas are just as welcome.

[Visit the Doodle Engine issue tracker](https://github.com/katbella/doodle-engine/issues) and take a quick look for a similar issue. If you do not find one, create an issue and begin its title with **[Studio]**, **[CLI]**, or **[Feedback]**.

## Report a problem

Describe what you were doing, what you expected, and what happened instead. Include the steps that reproduce the problem and your operating system. Screenshots or a short recording are especially helpful for visual problems.

If you are comfortable sharing a sample project, it can help with the investigation. Please remove any private writing or assets first.

### Doodle Studio

After the problem occurs, choose **Open Error Log** from the **Help** menu. Attach the log to the issue, or paste the part from the time the problem occurred.

Please also include the Studio version shown in **About** under the **Help** menu.

### Command line

Include:

- The exact command you ran
- The complete terminal output
- The results of `npx doodle --version` and `node --version`

## Validation issues

If the problem involves validation, start with the complete validation output in Doodle Studio or the terminal. It usually identifies the affected file and suggests what to check.

The [Content Validation guide](/guides/content-validation/) explains the checks and offers help with common validation errors. If the problem remains, include the complete validation output in your issue.

## Feedback and ideas

Have an idea that would make building your game easier or more fun? Share it in the same issue tracker. Describe what you are trying to create and what would make the experience better for you.
