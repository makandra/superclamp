# A sample Guardfile
# More info at https://github.com/guard/guard#readme

## Uncomment and set this to only include directories you want to watch
# directories %w(app lib config test spec features) \
#  .select{|d| Dir.exists?(d) ? d : UI.warning("Directory #{d} does not exist")}

## Note: if you are using the `directories` clause above and you are not
## watching the project directory ('.'), then you will want to move
## the Guardfile to a watched dir and symlink it back, e.g.
#
#  $ mkdir config
#  $ mv Guardfile config/
#  $ ln -s config/Guardfile .
#
# and, you'll have to watch "config/Guardfile" instead of "Guardfile"

coffeescript_options = {
  input: 'src',
  output: 'dist',
  patterns: [%r{^src/(.+\.(?:coffee|coffee\.md|litcoffee))$}],
  all_on_start: true,
}

guard 'coffeescript', coffeescript_options do
  coffeescript_options[:patterns].each { |pattern| watch(pattern) }
end

require 'uglifier'
class Guard::Minify < Guard::Plugin; end

guard :minify do
  watch(%r((dist/.+?)\.js)) do |filename, prefix|
    unless filename =~ /\.min\.js$/
      minified_filename = "#{prefix}.min.js"
      javascript = File.read(filename)
      File.open(minified_filename, 'w') do |file|
        file.write(Uglifier.compile(javascript))
        Compat::UI.info "Uglified #{filename} => #{minified_filename}"
      end
    end
  end
end
