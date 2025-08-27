const footerHtml=()=>{
   $('body').append(
`   <footer>
        <div class="footer-content">
          <p>&copy; ${new Date().getFullYear()} <a target="_blank" href="https://www.linkedin.com/in/benny-bornfeld-phd-4b6357?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BwxMoKMZAS%2F%2BDfldt8AcJ4w%3D%3D">Benny Bornfeld Ph.D.</a>  created by <a target="_blank" href="https://giladmeirson.github.io/Gilad_Meirson_website/">Gilad Meirson B.Sc.</a>  All rights reserved.</p>
          <nav class="footerNav">
            <a href="../bir/terms.html">Terms of Use</a>
            <a href="#">Contact Us</a>
          </nav>
        </div>
    </footer>`

   )
}