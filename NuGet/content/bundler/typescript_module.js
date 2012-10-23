var fs = require('fs');
var vm = require('vm');

// load the typescript compiler code into the module
filedata = fs.readFileSync(__dirname + '/node_modules/typescript/bin/typescript.js', 'utf8');
vm.runInThisContext(filedata, __dirname + '/node_modules/typescript/bin/typescript.js');

// these classes are copied directly from tsc.js
var IO = (function () {
    function getWindowsScriptHostIO() {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        var args = [];
        for(var i = 0; i < WScript.Arguments.length; i++) {
            args[i] = WScript.Arguments.Item(i);
        }
        return {
            readFile: function (path) {
                try  {
                    var file = fso.OpenTextFile(path);
                    var bomChar = !file.AtEndOfStream ? file.Read(2) : '';
                    var str = bomChar;
                    if((bomChar.charCodeAt(0) == 254 && bomChar.charCodeAt(1) == 255) || (bomChar.charCodeAt(0) == 255 && bomChar.charCodeAt(1) == 254)) {
                        file.close();
                        file = fso.OpenTextFile(path, 1, false, -1);
                        str = '';
                    }
                    if(!file.AtEndOfStream) {
                        str += file.ReadAll();
                    }
                    file.close();
                    return str;
                } catch (err) {
                    throw new Error("Error reading file \"" + path + "\": " + err.message);
                }
            },
            writeFile: function (path, contents) {
                var file = fso.OpenTextFile(path, 2, true);
                file.Write(contents);
                file.Close();
            },
            fileExists: function (path) {
                return fso.FileExists(path);
            },
            resolvePath: function (path) {
                return fso.GetAbsolutePathName(path);
            },
            dirName: function (path) {
                return fso.GetParentFolderName(path);
            },
            findFile: function (rootPath, partialFilePath) {
                var path = fso.GetAbsolutePathName(rootPath) + "/" + partialFilePath;
                while(true) {
                    if(fso.FileExists(path)) {
                        try  {
                            var content = this.readFile(path);
                            return {
                                content: content,
                                path: path
                            };
                        } catch (err) {
                        }
                    } else {
                        rootPath = fso.GetParentFolderName(fso.GetAbsolutePathName(rootPath));
                        if(rootPath == "") {
                            return null;
                        } else {
                            path = fso.BuildPath(rootPath, partialFilePath);
                        }
                    }
                }
            },
            deleteFile: function (path) {
                if(fso.FileExists(path)) {
                    fso.DeleteFile(path, true);
                }
            },
            createFile: function (path) {
                try  {
                    return fso.CreateTextFile(path, true, false);
                } catch (ex) {
                    WScript.StdErr.WriteLine("Couldn't write to file '" + path + "'");
                    throw ex;
                }
            },
            directoryExists: function (path) {
                return fso.FolderExists(path);
            },
            createDirectory: function (path) {
                if(!this.directoryExists(path)) {
                    fso.CreateFolder(path);
                }
            },
            dir: function (path, spec, options) {
                options = options || {
                };
                function filesInFolder(folder, root) {
                    var paths = [];
                    var fc;
                    if(options.recursive) {
                        fc = new Enumerator(folder.subfolders);
                        for(; !fc.atEnd(); fc.moveNext()) {
                            paths = paths.concat(filesInFolder(fc.item(), root + "\\" + fc.item().Name));
                        }
                    }
                    fc = new Enumerator(folder.files);
                    for(; !fc.atEnd(); fc.moveNext()) {
                        if(!spec || fc.item().Name.match(spec)) {
                            paths.push(root + "\\" + fc.item().Name);
                        }
                    }
                    return paths;
                }
                var folder = fso.GetFolder(path);
                var paths = [];
                return filesInFolder(folder, path);
            },
            print: function (str) {
                WScript.StdOut.Write(str);
            },
            printLine: function (str) {
                WScript.Echo(str);
            },
            arguments: args,
            stderr: WScript.StdErr,
            watchFiles: null,
            run: function (source, filename) {
                eval(source);
            },
            getExecutingFilePath: function () {
                return WScript.ScriptFullName;
            },
            quit: function (exitCode) {
                if (typeof exitCode === "undefined") { exitCode = 0; }
                try  {
                    WScript.Quit(exitCode);
                } catch (e) {
                }
            }
        };
    }
    ; ;
    function getNodeIO() {
        var _fs = require('fs');
        var _path = require('path');
        var _module = require('module');
        return {
            readFile: function (file) {
                var buffer = _fs.readFileSync(file);
                switch(buffer[0]) {
                    case 254: {
                        if(buffer[1] == 255) {
                            var i = 0;
                            while((i + 1) < buffer.length) {
                                var temp = buffer[i];
                                buffer[i] = buffer[i + 1];
                                buffer[i + 1] = temp;
                                i += 2;
                            }
                            return buffer.toString("ucs2", 2);
                        }
                        break;

                    }
                    case 255: {
                        if(buffer[1] == 254) {
                            return buffer.toString("ucs2", 2);
                        }
                        break;

                    }
                    case 239: {
                        if(buffer[1] == 187) {
                            return buffer.toString("utf8", 3);
                        }

                    }
                }
                return buffer.toString();
            },
            writeFile: _fs.writeFileSync,
            deleteFile: function (path) {
                try  {
                    _fs.unlinkSync(path);
                } catch (e) {
                }
            },
            fileExists: function (path) {
                return _fs.existsSync(path);
            },
            createFile: function (path) {
                function mkdirRecursiveSync(path) {
                    var stats = _fs.statSync(path);
                    if(stats.isFile()) {
                        throw "\"" + path + "\" exists but isn't a directory.";
                    } else {
                        if(stats.isDirectory()) {
                            return;
                        } else {
                            mkdirRecursiveSync(_path.dirname(path));
                            _fs.mkdirSync(path, 509);
                        }
                    }
                }
                mkdirRecursiveSync(_path.dirname(path));
                var fd = _fs.openSync(path, 'w');
                return {
                    Write: function (str) {
                        _fs.writeSync(fd, str);
                    },
                    WriteLine: function (str) {
                        _fs.writeSync(fd, str + '\r\n');
                    },
                    Close: function () {
                        _fs.closeSync(fd);
                        fd = null;
                    }
                };
            },
            dir: function dir(path, spec, options) {
                options = options || {
                };
                function filesInFolder(folder) {
                    var paths = [];
                    var files = _fs.readdirSync(folder);
                    for(var i = 0; i < files.length; i++) {
                        var stat = _fs.statSync(folder + "\\" + files[i]);
                        if(options.recursive && stat.isDirectory()) {
                            paths = paths.concat(filesInFolder(folder + "\\" + files[i]));
                        } else {
                            if(stat.isFile() && (!spec || files[i].match(spec))) {
                                paths.push(folder + "\\" + files[i]);
                            }
                        }
                    }
                    return paths;
                }
                return filesInFolder(path);
            },
            createDirectory: function (path) {
                if(!this.directoryExists(path)) {
                    _fs.mkdirSync(path);
                }
            },
            directoryExists: function (path) {
                return _fs.existsSync(path) && _fs.lstatSync(path).isDirectory();
            },
            resolvePath: function (path) {
                return _path.resolve(path);
            },
            dirName: function (path) {
                return _path.dirname(path);
            },
            findFile: function (rootPath, partialFilePath) {
                var path = rootPath + "/" + partialFilePath;
                while(true) {
                    if(_fs.existsSync(path)) {
                        try  {
                            var content = this.readFile(path);
                            return {
                                content: content,
                                path: path
                            };
                        } catch (err) {
                        }
                    } else {
                        var parentPath = _path.resolve(rootPath, "..");
                        if(rootPath === parentPath) {
                            return null;
                        } else {
                            rootPath = parentPath;
                            path = _path.resolve(rootPath, partialFilePath);
                        }
                    }
                }
            },
            print: function (str) {
                process.stdout.write(str);
            },
            printLine: function (str) {
                process.stdout.write(str + '\n');
            },
            arguments: process.argv.slice(2),
            stderr: {
                Write: function (str) {
                    process.stderr.write(str);
                },
                WriteLine: function (str) {
                    process.stderr.write(str + '\n');
                },
                Close: function () {
                }
            },
            watchFiles: function (files, callback) {
                var watchers = [];
                var firstRun = true;
                var isWindows = /^win/.test(process.platform);
                var processingChange = false;
                var fileChanged = function (e, fn) {
                    if(!firstRun && !isWindows) {
                        for(var i = 0; i < files.length; ++i) {
                            _fs.unwatchFile(files[i]);
                        }
                    }
                    firstRun = false;
                    if(!processingChange) {
                        processingChange = true;
                        callback();
                        setTimeout(function () {
                            processingChange = false;
                        }, 100);
                    }
                    if(isWindows && watchers.length === 0) {
                        for(var i = 0; i < files.length; ++i) {
                            var watcher = _fs.watch(files[i], fileChanged);
                            watchers.push(watcher);
                            watcher.on('error', function (e) {
                                process.stderr.write("ERROR" + e);
                            });
                        }
                    } else {
                        if(!isWindows) {
                            for(var i = 0; i < files.length; ++i) {
                                _fs.watchFile(files[i], {
                                    interval: 500
                                }, fileChanged);
                            }
                        }
                    }
                };
                fileChanged();
                return true;
            },
            run: function (source, filename) {
                require.main.filename = filename;
                require.main.paths = _module._nodeModulePaths(_path.dirname(_fs.realpathSync(filename)));
                require.main._compile(source, filename);
            },
            getExecutingFilePath: function () {
                return process.mainModule.filename;
            },
            quit: process.exit
        };
    }
    ; ;
    if(typeof ActiveXObject === "function") {
        return getWindowsScriptHostIO();
    } else {
        if(typeof require === "function") {
            return getNodeIO();
        } else {
            return null;
        }
    }
})();
var CommandLineHost = (function () {
    function CommandLineHost() {
        this.pathMap = {
        };
        this.resolvedPaths = {
        };
    }
    CommandLineHost.prototype.isResolved = function (path) {
        return this.resolvedPaths[this.pathMap[path]] != undefined;
    };
    CommandLineHost.prototype.resolveCompilationEnvironment = function (preEnv, resolver, traceDependencies) {
        var _this = this;
        var resolvedEnv = new TypeScript.CompilationEnvironment(preEnv.compilationSettings, preEnv.ioHost);
        var nCode = preEnv.code.length;
        var nRCode = preEnv.residentCode.length;
        var postResolutionError = function (errorFile, errorMessage) {
            TypeScript.CompilerDiagnostics.debugPrint("Could not resolve file '" + errorFile + "'" + (errorMessage == "" ? "" : ": " + errorMessage));
        };
        var resolutionDispatcher = {
            postResolutionError: postResolutionError,
            postResolution: function (path, code) {
                if(!_this.resolvedPaths[path]) {
                    resolvedEnv.code.push(code);
                    _this.resolvedPaths[path] = true;
                }
            }
        };
        var residentResolutionDispatcher = {
            postResolutionError: postResolutionError,
            postResolution: function (path, code) {
                if(!_this.resolvedPaths[path]) {
                    resolvedEnv.residentCode.push(code);
                    _this.resolvedPaths[path] = true;
                }
            }
        };
        var path = "";
        for(var i = 0; i < nRCode; i++) {
            path = TypeScript.switchToForwardSlashes(preEnv.ioHost.resolvePath(preEnv.residentCode[i].path));
            this.pathMap[preEnv.residentCode[i].path] = path;
            resolver.resolveCode(path, "", false, residentResolutionDispatcher);
        }
        for(var i = 0; i < nCode; i++) {
            path = TypeScript.switchToForwardSlashes(preEnv.ioHost.resolvePath(preEnv.code[i].path));
            this.pathMap[preEnv.code[i].path] = path;
            resolver.resolveCode(path, "", false, resolutionDispatcher);
        }
        return resolvedEnv;
    };
    return CommandLineHost;
})();

// this class has been modified to suit the needs of bundler
var BundleCompiler = (function () {
    function BundleCompiler(ioHost) {
        this.ioHost = ioHost;
        this.commandLineHost = new CommandLineHost();
        this.resolvedEnvironment = null;
        this.compilationSettings = new TypeScript.CompilationSettings();
        this.compilationEnvironment = new TypeScript.CompilationEnvironment(this.compilationSettings, this.ioHost);
    }
    BundleCompiler.prototype.resolve = function () {
        var resolver = new TypeScript.CodeResolver(this.compilationEnvironment);
        var ret = this.commandLineHost.resolveCompilationEnvironment(this.compilationEnvironment, resolver, true);
        for(var i = 0; i < this.compilationEnvironment.residentCode.length; i++) {
            if(!this.commandLineHost.isResolved(this.compilationEnvironment.residentCode[i].path)) {
                this.ioHost.stderr.WriteLine("Error reading file \"" + this.compilationEnvironment.residentCode[i].path + "\": File not found");
            }
        }
        for(var i = 0; i < this.compilationEnvironment.code.length; i++) {
            if(!this.commandLineHost.isResolved(this.compilationEnvironment.code[i].path)) {
                this.ioHost.stderr.WriteLine("Error reading file \"" + this.compilationEnvironment.code[i].path + "\": File not found");
            }
        }
        return ret;
    };
    BundleCompiler.prototype.compile = function (outfile, source, path) {
        var _this = this;

        _this.compilationSettings.outputMany = false;
        //_this.compilationSettings.mapSourceFiles = true;
        _this.compilationSettings.errorRecovery = true;
        //_this.compilationSettings.useDefaultLib = false;
        _this.compilationSettings.codeGenTarget = TypeScript.CodeGenTarget.ES5;

        if(this.compilationSettings.useDefaultLib) {
            code = new TypeScript.SourceUnit(__dirname + "\\node_modules\\typescript\\bin\\lib.d.ts", null);
            this.compilationEnvironment.code.push(code);
        }
        this.compilationEnvironment.code.push(new TypeScript.SourceUnit(path, source));
        this.resolvedEnvironment = this.compilationSettings.resolve ? this.resolve() : this.compilationEnvironment;

        var compiler;
        var errout = null;
        if(this.compilationSettings.errorFileName) {
            errout = this.ioHost.createFile(this.compilationSettings.errorFileName);
            compiler = new TypeScript.TypeScriptCompiler(outfile, errout, new TypeScript.NullLogger(), this.compilationSettings);
            compiler.setErrorOutput(errout);
        } else {
            compiler = new TypeScript.TypeScriptCompiler(outfile, outfile, new TypeScript.NullLogger(), this.compilationSettings);
            compiler.setErrorOutput(this.ioHost.stderr);
            compiler.setErrorCallback(function (minChar, charLen, message, unitIndex) {
                compiler.errorReporter.hasErrors = true;
                var fname = _this.resolvedEnvironment.code[unitIndex].path;
                var msg = fname + " (" + compiler.parser.scanner.line + "," + compiler.parser.scanner.col + "): " + message;
                if(_this.compilationSettings.errorRecovery) {
                    _this.ioHost.stderr.WriteLine(msg);
                } else {
                    throw new SyntaxError(msg);
                }
            });
        }
        if(this.compilationSettings.emitComments) {
            compiler.emitCommentsToOutput();
        }
        var consumeUnit = function (code, addAsResident) {
            try  {
                if(!_this.compilationSettings.resolve) {
                    code.content = _this.ioHost.readFile(code.path);
                }
                if(code.content) {
                    if(_this.compilationSettings.parseOnly) {
                        compiler.parseUnit(code.content, code.path);
                    } else {
                        if(_this.compilationSettings.errorRecovery) {
                            compiler.parser.setErrorRecovery(outfile, -1, -1);
                        }
                        compiler.addUnit(code.content, code.path, addAsResident);
                    }
                }
            } catch (err) {
                compiler.errorReporter.hasErrors = true;
                if(errout) {
                    errout.WriteLine(err.message);
                } else {
                    _this.ioHost.stderr.WriteLine(err.message);
                }
            }
        };
        for(var iResCode = 0; iResCode < this.resolvedEnvironment.residentCode.length; iResCode++) {
            if(!this.compilationSettings.parseOnly) {
                consumeUnit(this.resolvedEnvironment.residentCode[iResCode], true);
            }
        }
        for(var iCode = 0; iCode < this.resolvedEnvironment.code.length; iCode++) {
            if(!this.compilationSettings.parseOnly || (iCode > 0)) {
                consumeUnit(this.resolvedEnvironment.code[iCode], false);
            }
        }
        if(!this.compilationSettings.parseOnly) {
            compiler.typeCheck();
            if(this.compilationSettings.generateDeclarationFiles && compiler.errorReporter.hasErrors) {
                this.compilationSettings.generateDeclarationFiles = false;
            }
            try  {
                compiler.emit(this.compilationSettings.outputMany, function createFile(fileName) {
                    return outfile;
                });
            } catch (err) {
                if(err.message != "EmitError") {
                    throw err;
                }
            }
        }
        if(outfile) {
            outfile.Close();
        }
        if(errout) {
            errout.Close();
        }

        return outfile.source;
    };
    return BundleCompiler;
})();

function compile(source, path) {
    var compiler = new BundleCompiler(IO);
    var outfile = {
        source: '',
        Write: function(s) {
            this.source += s;
        },
        WriteLine: function(s) {
            this.source += s + '\n';
        },
        Close: function() {}
    };

    try {
        compiler.compile(outfile, source, path);
        return outfile.source;
    } catch(e) {
        console.log('Fatal error: ', e);
    }
}

exports.compile = compile;