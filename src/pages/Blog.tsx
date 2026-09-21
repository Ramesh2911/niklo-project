import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useI18n } from '../contexts/I18nContext';
import blogImg from '../assets/experiences_hero.jpg';
import './Blog.css';

const BLOG_POSTS = [
  { titleKey: 'blog.post1Title', descKey: 'blog.post1Desc', date: 'Sep 15, 2026', category: 'Travel Tips' },
  { titleKey: 'blog.post2Title', descKey: 'blog.post2Desc', date: 'Sep 10, 2026', category: 'Company Update' },
  { titleKey: 'blog.post3Title', descKey: 'blog.post3Desc', date: 'Sep 5, 2026', category: 'Stories' },
  { titleKey: 'blog.post4Title', descKey: 'blog.post4Desc', date: 'Aug 28, 2026', category: 'Travel Tips' },
  { titleKey: 'blog.post5Title', descKey: 'blog.post5Desc', date: 'Aug 20, 2026', category: 'Company Update' },
  { titleKey: 'blog.post6Title', descKey: 'blog.post6Desc', date: 'Aug 12, 2026', category: 'Stories' },
];

const Blog: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="bl-page-wrapper">
      <Navbar theme="blue" />
      <div className="bl-header-section">
        <div className="bl-header-container">
          <h1>{t('blog.pageTitle')}</h1>
          <p>{t('blog.pageSubtitle')}</p>
        </div>
      </div>
      <main className="bl-main">
        <section className="bl-story-section">
          <div className="bl-story-content">
            <h2>{t('blog.storyTitle')}</h2>
            <p>{t('blog.storyPara1')}</p>
            <p>{t('blog.storyPara2')}</p>
          </div>
          <img src={blogImg} alt="Niklo blog" className="bl-story-image" />
        </section>

        <section className="bl-posts-section">
          <h2 className="bl-section-title">{t('blog.postsTitle')}</h2>
          <p className="bl-section-subtitle">{t('blog.postsSubtitle')}</p>
          <div className="bl-posts-grid">
            {BLOG_POSTS.map((post, idx) => (
              <div key={idx} className="bl-post-card">
                <div className="bl-post-meta">
                  <span className="bl-post-category">
                    <Tag size={12} /> {post.category}
                  </span>
                  <span className="bl-post-date">
                    <Calendar size={12} /> {post.date}
                  </span>
                </div>
                <h3>{t(post.titleKey)}</h3>
                <p>{t(post.descKey)}</p>
                <button className="bl-read-more">
                  {t('blog.readMore')} <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bl-cta-section">
          <h2>{t('blog.ctaTitle')}</h2>
          <p>{t('blog.ctaDesc')}</p>
          <button className="bl-cta-btn" onClick={() => navigate('/')}>
            {t('blog.ctaButton')} <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
