import './Home.css';

const Home = () => (
  <div className="home">
    <p>Simple Player</p>
    <ul>
      <li>
        <a href="/SimplePlayer/EM">Joe Rogan Experience #1169 - Elon Musk (2h37)</a>
      </li>
      <li>
        <a href="/SimplePlayer/AJ">Joe Rogan Experience #1255 - Alex Jones Returns! (4h~)</a>
      </li>
    </ul>
    <p>Simple Player with ligther DOM off-screen</p>
    <ul>
      <li>
        <a href="/SimplePlayerLightDOM/EM">Joe Rogan Experience #1169 - Elon Musk (2h37)</a>
      </li>
      <li>
        <a href="/SimplePlayerLightDOM/AJ">Joe Rogan Experience #1255 - Alex Jones Returns! (4h~)</a>
      </li>
    </ul>
  </div>
);

export default Home;
