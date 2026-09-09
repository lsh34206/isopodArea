import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Login from './layout/auth/login'
import SiteHeader from './layout/header'
import CommunityBoard from './layout/community/communityBoard'
import CommunityWrite from './layout/community/communityWrite'
import CommunityPostDetail from './layout/community/communityPostDetail'
import CareSheetWrite from './layout/careSheet/careSheetWrite'
import CareSheetBoard from './layout/careSheet/careSheetBoard'
import CareSheetDetail from './layout/careSheet/careSheetDetail'
import GalleryBoard from './layout/gallery/galleryBoard'
import GalleryWrite from './layout/gallery/galleryWrite'
import GalleryDetail from './layout/gallery/galleryDetail'
import MarketBoard from './layout/market/marketBoard'
import MarketWrite from './layout/market/marketWrite'
import MarketDetail from './layout/market/marketDetail'
import AuctionBoard from './layout/auction/auctionBoard'
import AuctionWrite from './layout/auction/auctionWrite'
import AuctionRoom from './layout/auction/auctionRoom'
import UserProfile from './layout/user/userProfile'
import Settings from './layout/user/settings'
import SearchResults from './layout/search/searchResults'
import MailboxList from './layout/mailbox/mailboxList'
import MailboxRoom from './layout/mailbox/mailboxRoom'
import Avatar from './layout/avatar'
import { api } from './api'
import './App.css'

const boards = [
  {
    icon: '🦐',
    name: '등각류 게시판',
    desc: '쥐며느리부터 다이어리 카우, 루비 더키까지 — 등각류 사육 이야기를 나눠요.',
    to: '/community/isopod',
  },
  {
    icon: '🐛',
    name: '배각류 게시판',
    desc: '밀리피드의 사육, 탈피, 번식에 대한 모든 이야기가 모이는 곳.',
    to: '/community/millipede',
  },
  {
    icon: '📗',
    name: '사육 정보',
    desc: '바닥재, 습도, 먹이, 사육장 세팅까지 검증된 노하우 아카이브.',
    to: '/care-sheet/isopod',
  },
  {
    icon: '📷',
    name: '갤러리',
    desc: '내 사육장과 아이들을 마음껏 자랑하는 공간.',
    to: '/gallery/isopod',
  },
  {
    icon: '🐚',
    name: '분양',
    desc: '직접 기르는 개체를 분양하거나 무료로 나눠보세요.',
    to: '/market/isopod',
  },
  {
    icon: '🔨',
    name: '실시간 경매',
    desc: '실시간으로 입찰하며 원하는 개체를 낙찰받아 보세요.',
    to: '/auction/isopod',
  },
]

const chipClass: Record<string, string> = {
  등각류: 'chip chip-iso',
  배각류: 'chip chip-milli',
}

interface RecentPost {
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

const communityBoards = [
  { board: 'isopod', category: '등각류' },
  { board: 'millipede', category: '배각류' },
] as const
const otherBoards = ['isopod', 'millipede'] as const

function Home() {
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [stats, setStats] = useState<{
    totalUsers: number
    totalPosts: number
    totalCareSheets: number
    totalPhotos: number
    totalSells: number
    totalAuctions: number
  }>({
    totalUsers: 0,
    totalPosts: 0,
    totalCareSheets: 0,
    totalPhotos: 0,
    totalSells: 0,
    totalAuctions: 0,
  })
  useEffect(() => {
    let ignore = false

    api.get('/home').then((res) => {
      if (ignore) return
      setStats(res.data.stats)
    })

    Promise.allSettled([
      ...communityBoards.map(({ board }) => api.get(`/community/${board}/free`)),
      ...otherBoards.map((board) => api.get(`/care-sheet/${board}`)),
      ...otherBoards.map((board) => api.get(`/photo/${board}`)),
      ...otherBoards.map((board) => api.get(`/market/${board}`)),
    ]).then((results) => {
      if (ignore) return
      const posts: RecentPost[] = []
      let i = 0

      for (const { board, category } of communityBoards) {
        const result = results[i++]
        if (result.status !== 'fulfilled' || !result.value.data.success) continue
        for (const post of result.value.data.posts) {
          posts.push({
            id: post._id,
            category,
            title: post.title,
            author: post.uploaderName,
            authorId: post.uploaderId,
            authorAvatar: post.uploaderAvatar,
            comments: post.comment_count ?? 0,
            createdAt: post.createdAt,
            href: `/community/${board}/free/${post._id}`,
          })
        }
      }

      for (const board of otherBoards) {
        const result = results[i++]
        if (result.status !== 'fulfilled' || !result.value.data.success) continue
        for (const cs of result.value.data.careSheets) {
          posts.push({
            id: cs._id,
            category: '사육 정보',
            title: cs.title ?? `${cs.subSpecies} (${cs.species})`,
            author: cs.uploaderName,
            authorId: cs.uploaderId,
            authorAvatar: cs.uploaderAvatar,
            comments: cs.comment_count ?? 0,
            createdAt: cs.createdAt,
            href: `/care-sheet/${board}/${cs._id}`,
          })
        }
      }

      for (const board of otherBoards) {
        const result = results[i++]
        if (result.status !== 'fulfilled' || !result.value.data.success) continue
        for (const photo of result.value.data.photos) {
          posts.push({
            id: photo._id,
            category: '갤러리',
            title: photo.title,
            author: photo.uploaderName,
            authorId: photo.uploaderId,
            authorAvatar: photo.uploaderAvatar,
            comments: photo.comment_count ?? 0,
            createdAt: photo.createdAt,
            href: `/gallery/${board}/${photo._id}`,
          })
        }
      }

      for (const board of otherBoards) {
        const result = results[i++]
        if (result.status !== 'fulfilled' || !result.value.data.success) continue
        for (const listing of result.value.data.listings) {
          posts.push({
            id: listing._id,
            category: '분양',
            title: listing.title,
            author: listing.sellerName,
            authorId: listing.sellerId,
            authorAvatar: listing.uploaderAvatar,
            comments: listing.comment_count ?? 0,
            createdAt: listing.createdAt,
            href: `/market/${board}/${listing._id}`,
          })
        }
      }

      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setRecentPosts(posts.slice(0, 6))
    })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="home">
      <SiteHeader />

      <main>
        <section className="hero-banner">
          <p className="hero-eyebrow">Isopoda &amp; Diplopoda Community</p>
          <h1 className="hero-title">
            우리들의 <span className="highlight">등·배각류</span> 공간
          </h1>
          <p className="hero-sub">
            낙엽 아래 작은 세계를 사랑하는 사람들의 커뮤니티.
            <br />
            등각류와 배각류의 사육 정보를 나누고, 자랑하고, 함께 성장해요.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg">커뮤니티 시작하기</Link>
            <a href="#boards" className="btn btn-ghost btn-lg">게시판 둘러보기</a>
          </div>
          <dl className="stats">
            <div>
                <dd>{stats.totalUsers}</dd>
                <dt>회원</dt>
            </div>
            <div>
              <dd>{stats.totalPosts}</dd>
              <dt>누적 게시글</dt>
            </div>
            <div>
              <dd>{stats.totalCareSheets}</dd>
              <dt>사육 종 데이터</dt>
            </div>
            <div>
              <dd>{stats.totalPhotos}</dd>
              <dt>누적 사진</dt>
            </div>
            <div>
              <dd>{stats.totalSells}</dd>
              <dt>누적 분양</dt>
            </div>
            <div>
              <dd>{stats.totalAuctions}</dd>
              <dt>누적 경매</dt>
            </div>
          </dl>
        </section>

        <section id="boards" className="section">
          <h2 className="section-title">게시판</h2>
          <div className="board-grid">
            {boards.map((board) => (
              board.to ? (
                <Link key={board.name} to={board.to} className="board-card">
                  <span className="board-icon" aria-hidden>{board.icon}</span>
                  <h3>{board.name}</h3>
                  <p>{board.desc}</p>
                </Link>
              ) : (
                <article key={board.name} className="board-card">
                  <span className="board-icon" aria-hidden>{board.icon}</span>
                  <h3>{board.name}</h3>
                  <p>{board.desc}</p>
                </article>
              )
            ))}
          </div>
        </section>

        {recentPosts.length > 0 && (
          <section id="posts" className="section">
            <h2 className="section-title">최신 글</h2>
            <ul className="post-list">
              {recentPosts.map((post) => (
                <li key={post.id} className="post-item">
                  <span className={chipClass[post.category] ?? 'chip'}>{post.category}</span>
                  <Link to={post.href} className="post-title post-title-link">
                    {post.title}
                  </Link>
                  <span className="post-meta">
                    <span className="author-with-avatar">
                      <Avatar src={post.authorAvatar} size={20} />
                      <Link to={`/users/${post.authorId}`} className="author-link">{post.author}</Link>
                    </span>
                    {' '}· 댓글 {post.comments}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="about" className="section about">
          <h2 className="section-title">이곳은 어떤 공간인가요?</h2>
          <p>
            등각류(Isopoda)와 배각류(Diplopoda)는 낙엽과 흙 속에서 유기물을 분해하며 살아가는
            작지만 소중한 생물들입니다. 이 커뮤니티는 이들을 아끼고 사육하는 사람들이 모여
            서로의 경험과 지식을 나누는 공간입니다. 처음 입문하는 분도, 오래 사육해 온 분도
            모두 환영해요.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />
        <Route path="/community/:board" element={<CommunityBoard />} />
        <Route path="/community/:board/write" element={<CommunityWrite />} />
        <Route path="/community/:board/:type/:id/edit" element={<CommunityWrite />} />
        <Route path="/community/:board/:type/:id" element={<CommunityPostDetail />} />
        <Route path="/care-sheet/write" element={<CareSheetWrite />} />
        <Route path="/care-sheet/:board" element={<CareSheetBoard />} />
        <Route path="/care-sheet/:board/:id/edit" element={<CareSheetWrite />} />
        <Route path="/care-sheet/:board/:id" element={<CareSheetDetail />} />
        <Route path="/gallery/write" element={<GalleryWrite />} />
        <Route path="/gallery/:board" element={<GalleryBoard />} />
        <Route path="/gallery/:board/:id/edit" element={<GalleryWrite />} />
        <Route path="/gallery/:board/:id" element={<GalleryDetail />} />
        <Route path="/market/write" element={<MarketWrite />} />
        <Route path="/market/:board" element={<MarketBoard />} />
        <Route path="/market/:board/:id/edit" element={<MarketWrite />} />
        <Route path="/market/:board/:id" element={<MarketDetail />} />
        <Route path="/auction/write" element={<AuctionWrite />} />
        <Route path="/auction/:board" element={<AuctionBoard />} />
        <Route path="/auction/:board/:id" element={<AuctionRoom />} />
        <Route path="/users/:id" element={<UserProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/mailbox" element={<MailboxList />} />
        <Route path="/mailbox/:roomId" element={<MailboxRoom />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
