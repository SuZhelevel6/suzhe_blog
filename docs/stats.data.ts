import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsDir = __dirname

interface Stats {
  totalArticles: number
  totalWords: number
  androidCount: number
}

// 统计中文字数（中文字符 + 英文单词）
function countWords(content: string): number {
  // 移除 frontmatter
  content = content.replace(/^---[\s\S]*?---/, '')
  // 移除 HTML 标签
  content = content.replace(/<[^>]+>/g, '')
  // 移除代码块
  content = content.replace(/```[\s\S]*?```/g, '')
  // 移除行内代码
  content = content.replace(/`[^`]+`/g, '')
  // 移除链接
  content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 移除图片
  content = content.replace(/!\[[^\]]*\]\([^)]+\)/g, '')

  // 统计中文字符
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  // 统计英文单词
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length

  return chineseChars + englishWords
}

function scanDir(dir: string, stats: Stats) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // 跳过隐藏目录和 public 目录
      if (!file.startsWith('.') && file !== 'public' && file !== 'node_modules') {
        scanDir(filePath, stats)
      }
    } else if (file.endsWith('.md') && file !== 'index.md' && file !== 'AboutMe.md') {
      stats.totalArticles++

      const content = fs.readFileSync(filePath, 'utf-8')
      stats.totalWords += countWords(content)

      // 统计 Android 相关文章
      if (filePath.includes('android-app') || filePath.includes('android-system')) {
        stats.androidCount++
      }
    }
  }
}

export default {
  load(): Stats {
    const stats: Stats = {
      totalArticles: 0,
      totalWords: 0,
      androidCount: 0
    }

    scanDir(docsDir, stats)

    return stats
  }
}

export type { Stats }
