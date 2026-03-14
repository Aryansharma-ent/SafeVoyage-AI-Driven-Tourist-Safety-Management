import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  FaMapLocationDot,
  FaTriangleExclamation,
  FaShield,
  FaUsers,
  FaCircleCheck,
  FaArrowRight,
  FaBrain,
  FaLock,
  FaPhone,
  FaRobot,
  FaClock,
  FaLocationDot,
  FaCloud,
  FaNetworkWired,
  FaBell,
} from "react-icons/fa6";
import "./Home.css";

function Home() {
  const stats = [
    { icon: FaUsers, value: "142,000+", label: "Tourists Protected" },
    { icon: FaCircleCheck, value: "98%", label: "Alert Accuracy" },
    { icon: FaClock, value: "87s", label: "Avg Response Time" },
    { icon: FaLocationDot, value: "340+", label: "Zones Monitored" },
  ];

  const features = [
    {
      icon: FaBrain,
      title: "AI Risk Prediction Engine",
      description: "Dynamic risk scores generated from historical crime data, terrain sensitivity, weather inputs, and movement patterns — issuing preventive alerts before incidents occur.",
      tags: ["Predictive ML", "Real-time", "92% accuracy"],
    },
    {
      icon: FaLocationDot,
      title: "Geo-fencing & Zone Alerts",
      description: "Intelligent perimeter monitoring with adaptive geo-fence zones. Instant push alerts when tourists enter or approach high-risk territories.",
      tags: ["Active zones", "Multi-layer", "GPS precision"],
    },
    {
      icon: FaNetworkWired,
      title: "Blockchain Incident Logging",
      description: "Tamper-proof, decentralized evidence trail for every reported incident. Immutable records ensuring accountability and legal admissibility.",
      tags: ["Decentralized", "Tamper-proof", "IPFS stored"],
    },
    {
      icon: FaRobot,
      title: "Behavior Anomaly Detection",
      description: "AI engine monitors route deviation, prolonged inactivity, speed anomalies, and communication blackouts to trigger proactive safety interventions.",
      tags: ["Real-time analysis", "ML-powered", "Auto alerts"],
    },
    {
      icon: FaPhone,
      title: "Panic-Triggered SOS",
      description: "One-touch emergency activation broadcasts live location to local authorities, emergency contacts, and our 24/7 response center simultaneously.",
      tags: ["Voice alerts", "Live routing", "Multi-agency"],
    },
    {
      icon: FaShield,
      title: "Real-time Command Center",
      description: "Centralized authority dashboard with live heat maps, search prediction support, tourist tracking, and coordinated multi-agency emergency response tools.",
      tags: ["Live ops", "AI predictions", "Multi-agency"],
    },
  ];

  const workflow = [
    {
      step: "01",
      title: "Register & Check-in",
      description: "Tourists register their journey, share emergency contacts, and enable location sharing via the mobile app.",
    },
    {
      step: "02",
      title: "AI Risk Assessment",
      description: "The system continuously calculates risk scores based on location, weather, terrain, and behavioral patterns.",
    },
    {
      step: "03",
      title: "Proactive Alerts",
      description: "Before you enter a risky zone, preventive alerts are issued with recommended safe alternatives.",
    },
    {
      step: "04",
      title: "Emergency Response",
      description: "If an emergency occurs, authorities are instantly notified with precise location and incident context.",
    },
  ];

  const behaviors = [
    {
      icon: FaArrowRight,
      title: "Route Deviation Detection",
      description: "Alerts when you stray from planned trails",
    },
    {
      icon: FaClock,
      title: "Inactivity Monitoring",
      description: "Checks if no movement is detected for 30 min",
    },
    {
      icon: FaCloud,
      title: "Weather Risk Integration",
      description: "Real-time storm, flood and avalanche warnings",
    },
    {
      icon: FaLock,
      title: "Privacy-First Design",
      description: "Data anonymized and encrypted end-to-end",
    },
  ];

  return (
    <div className="home-page">
      <Navbar />
      <div className="home-container">
        {/* Hero Section */}
        <div className="hero-section" data-aos="fade-in">
          <div className="hero-background">
            <div className="hero-glow hero-glow-1"></div>
            <div className="hero-glow hero-glow-2"></div>
          </div>
          <div className="hero-content">
            <div className="hero-badges">
              <span className="badge badge-primary">AI-Powered Safety Platform</span>
              <span className="badge badge-success">● Live</span>
            </div>
            <h1 className="hero-title">
              Smart Protec<span className="gradient-text">tion</span>
              <br />
              <span className="text-gradient">Every Journey</span>
            </h1>
            <p className="hero-description">
              Predictive AI risk modeling, geo-fencing, and incident logging — proactively protecting travelers in remote regions worldwide.
            </p>
            <div className="hero-buttons">
              <Link to="/map" className="btn btn-primary btn-large">
                <FaMapLocationDot /> View Risk Map
              </Link>
              <Link to="/emergency" className="btn btn-secondary btn-large">
                Emergency SOS
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-section" data-aos="fade-up">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-card" data-aos="zoom-in" data-aos-delay={idx * 100}>
              <stat.icon className="stat-icon" />
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Access Section */}
        <section className="quick-access-section" data-aos="fade-up">
          <div className="section-header">
            <h2>Quick Access</h2>
            <p>Everything you need, one tap away</p>
          </div>
          <div className="quick-access-grid">
            <Link to="/map" className="quick-card quick-card-1" data-aos="fade-up" data-aos-delay="0">
              <div className="quick-card-icon">
                <FaMapLocationDot />
              </div>
              <h3>Live Risk Map</h3>
              <p>See real-time risk zones, geo-fence boundaries, and tourist locations across all monitored regions.</p>
              <span className="card-action">Open <FaArrowRight /></span>
            </Link>

            <Link to="/emergency" className="quick-card quick-card-2" data-aos="fade-up" data-aos-delay="100">
              <div className="quick-card-icon">
                <FaPhone />
              </div>
              <h3>Emergency SOS</h3>
              <p>Trigger an emergency alert instantly. Broadcasts your live location to authorities and emergency contacts.</p>
              <span className="card-action">Open <FaArrowRight /></span>
            </Link>

            <Link to="/incident" className="quick-card quick-card-3" data-aos="fade-up" data-aos-delay="200">
              <div className="quick-card-icon">
                <FaTriangleExclamation />
              </div>
              <h3>Report Incident</h3>
              <p>Log a security incident with blockchain-backed evidence trails for tamper-proof accountability.</p>
              <span className="card-action">Open <FaArrowRight /></span>
            </Link>
          </div>
        </section>

        {/* Six Layers Section */}
        <section className="layers-section" data-aos="fade-up">
          <div className="section-header">
            <span className="section-label">Platform Capabilities</span>
            <h2>Six Layers of Protection</h2>
            <p>A multi-layered safety ecosystem designed for modern tourist protection in any terrain or risk environment.</p>
          </div>
          <div className="layers-grid">
            {features.map((feature, idx) => (
              <div key={idx} className="layer-card" data-aos="zoom-in" data-aos-delay={idx * 50}>
                <div className="layer-icon">
                  <feature.icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="layer-tags">
                  {feature.tags.map((tag, i) => (
                    <span key={i} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="workflow-section" data-aos="fade-up">
          <div className="section-header">
            <span className="section-label">How It Works</span>
            <h2>From Registration to Safety</h2>
            <p>A seamless four-step process that keeps you protected from the moment your journey begins.</p>
          </div>
          <div className="workflow-steps">
            {workflow.map((item, idx) => (
              <div key={idx} className="workflow-step" data-aos="fade-up" data-aos-delay={idx * 100}>
                <div className="step-number">{item.step}</div>
                <div className="step-icon">
                  {idx === 0 && <FaUsers />}
                  {idx === 1 && <FaBrain />}
                  {idx === 2 && <FaBell />}
                  {idx === 3 && <FaShield />}
                </div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Analytics Section */}
        <section className="analytics-section" data-aos="fade-up">
          <div className="section-header">
            <span className="section-label">AI & Behavior Analytics</span>
            <h2>AI that Watches Out for You</h2>
            <p>Our proprietary AI engine continuously analyzes movement patterns, route adherence, communication frequency, and environmental signals to detect potential danger before it becomes a crisis.</p>
          </div>
          <div className="analytics-grid">
            {behaviors.map((behavior, idx) => (
              <div key={idx} className="analytics-card" data-aos="fade-up" data-aos-delay={idx * 100}>
                <div className="analytics-icon">
                  <behavior.icon />
                </div>
                <h4>{behavior.title}</h4>
                <p>{behavior.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section" data-aos="zoom-in">
          <div className="cta-content">
            <div className="cta-icon">
              <FaShield />
            </div>
            <h2>Ready to Travel Safely?</h2>
            <p>Join 142,000+ tourists who trust SafeRoute AI for real-time protection during their adventures.</p>
            <div className="cta-buttons">
              <Link to="/map" className="btn btn-primary btn-large">
                <FaMapLocationDot /> Explore Risk Map
              </Link>
              <Link to="/admin/login" className="btn btn-outline btn-large">
                Authority Access <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;