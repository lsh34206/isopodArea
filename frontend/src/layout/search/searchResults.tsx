import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import '../../App.css'

interface SearchResult {
    id: string
    category: string
    title: string
    author: string
    authorId: string
    authorAvatar: string
    comments: number
    createdAt: string
    href: string
}

const chipClass: Record<string, string> = {
    등각류: 'chip chip-iso',
    배각류: 'chip chip-milli',
}

function formatDate(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd}`
}

function SearchResults() {
    const [searchParams] = useSearchParams()
    const query = (searchParams.get('q') ?? '').trim()
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!query) {
            setResults([])
            setLoading(false)
            return
        }

        let ignore = false
        setLoading(true)
        api.get('/search', { params: { q: query } })
            .then(({ data }) => {
                if (!ignore) setResults(data.success ? data.results : [])
            })
            .catch(() => {
                if (!ignore) setResults([])
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })
        return () => {
            ignore = true
        }
    }, [query])

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    <div className="board-head">
                        <span className="board-head-icon" aria-hidden>🔍</span>
                        <div>
                            <h1 className="board-head-title">검색 결과</h1>
                            <p className="board-head-desc">
                                {query ? `"${query}"에 대한 검색 결과입니다.` : '검색어를 입력해 주세요.'}
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="board-empty">검색 중...</div>
                    ) : results.length === 0 ? (
                        <div className="board-empty">
                            {query ? '검색 결과가 없습니다.' : '게시판, 사육 정보, 갤러리 글을 제목과 내용으로 검색해 보세요.'}
                        </div>
                    ) : (
                        <ul className="post-list">
                            {results.map((result) => (
                                <li key={result.href} className="post-item">
                                    <span className={chipClass[result.category] ?? 'chip'}>{result.category}</span>
                                    <Link to={result.href} className="post-title post-title-link">
                                        {result.title}
                                    </Link>
                                    <span className="post-meta">
                                        <span className="author-with-avatar">
                                            <Avatar src={result.authorAvatar} size={20} />
                                            <Link to={`/users/${result.authorId}`} className="author-link">{result.author}</Link>
                                        </span>
                                        {' '}· {formatDate(result.createdAt)} · 댓글 {result.comments}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default SearchResults
