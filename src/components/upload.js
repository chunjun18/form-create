import Handler from "../factory/handler";
import Render from "../factory/render";
import {extend, isUndef, toString, uniqueId} from "../core/util";
import {iviewConfig} from "../core/common";
import {creatorTypeFactory} from "../factory/creator";

const name = "upload";

export function getFileName(pic) {
    let res = toString(pic).split('/'),
        file = res[res.length - 1],
        index = file.indexOf('.');
    return index === -1 ? file : file.substr(0, index);
}

export function parseValue(value) {
    return Array.isArray(value)
        ? value
        : ((!value ? [] : [value])
        );
}

class handler extends Handler {
    init() {
        let props = this.rule.props;
        props.defaultFileList = [];
        props.showUploadList = false;
        props.uploadType = !props.uploadType
            ? 'file'
            : props.uploadType;
        if (props.maxLength === undefined) props.maxLength = 0;
        if (props.action === undefined) props.action = '';
        if (props.uploadType === 'file' && props.handleIcon === undefined) props.handleIcon = false;
        this.parseValue = [];
        this.rule.value = parseValue(this.rule.value);

    }

    toParseValue(value) {
        let files = parseValue(value);
        this.parseValue.splice(0, this.parseValue.length);
        files.forEach((file) => this.push(file));
        this.rule.props.defaultFileList = this.parseValue;
        return this.parseValue;
    }

    mounted() {
        super.mounted();
        // this.el.fileList = this.parseValue;
        this.rule.props.defaultFileList = this.parseValue;
        this.changeParseValue(this.el.fileList);
    }

    push(file) {
        this.parseValue.push({
            url: file,
            name: getFileName(file)
        });
    }

    toTrueValue(parseValue) {
        if (!parseValue) return [];
        let files = parseValue.map((file) => file.url).filter((file) => file !== undefined);
        return this.rule.props.maxLength === 1
            ? (files[0] || '')
            : files;
    }

    changeParseValue(parseValue) {
        this.parseValue = parseValue;
        this.vm.changeFormData(this.field, parseValue);
    }

    // watchParseValue(n){
    //
    // }

    watchTrueValue(n) {
        let b = true;
        this.rule.props.defaultFileList.forEach((pic) => {
            b = b && (pic.percentage === undefined || pic.status === 'finished');
        });
        if (b)
            super.watchTrueValue(n);
    }


}


//const propsEventType = ['beforeUpload','onProgress','onPreview','onRemove','onFormatError','onExceededSize','onError'];

class render extends Render {
    init() {
        let handler = this.handler;
        this.uploadOptions = extend(extend({}, this.options.upload), this.handler.rule.props);
        this.issetIcon = this.uploadOptions.allowRemove || this.uploadOptions.handleIcon;
        this.propsData = this.vData.props(this.uploadOptions)
            .props('onSuccess', (...arg) => this.onSuccess(...arg)).ref(handler.refName).key(`fip${handler.unique}`).get();
    }

    onSuccess(response, file, fileList) {
        let url = this.uploadOptions.onSuccess.call(null, response, file, fileList);

        if (!isUndef(url)) {
            file.url = url;
            file.showProgress = false;

            // fileList.push({
            //     url,
            //     name: getFileName(url)
            // });
            // this.handler.changeParseValue(this.handler.el.fileList);

        } else {
            let index = fileList.indexOf(file);
            if (index !== -1)
                fileList.splice(index, 1);
        }
    }

    defaultOnHandle(src) {
        this.vm.$Modal.remove();
        setTimeout(() => {
            this.vm.$Modal.info({
                title: "预览",
                render: (h) => {
                    return h('img', {attrs: {src}, style: "width: 100%", key: 'ifmd' + uniqueId()});
                },
                showCancel: true,
                closable: true,
                scrollable: true
            });
        }, 301);
    }

    onHandle(src) {
        let fn = this.uploadOptions.onHandle;
        if (fn)
            return fn(src);
        else
            this.defaultOnHandle(src);
    }

    parse() {
        let {unique} = this.handler;
        this.init();
        if (this.uploadOptions.handleIcon === true) this.uploadOptions.handleIcon = 'ios-eye-outline';
        let value = this.vm.cptData[this.handler.field],
            render = [...value.map((file, index) => {
                if (file.showProgress) {
                    return this.makeProgress(file, `uppg${index}${unique}`);
                } else if (file.status === undefined || file.status === 'finished') {
                    return this.makeUploadView(file.url, `upview${index}${unique}`, index)
                }
            })];
        render.push(this.makeUploadBtn(unique, (!this.uploadOptions.maxLength || this.uploadOptions.maxLength > this.vm.cptData[this.handler.field].length)));
        return [this.vNode.make('div', {key: `div4${unique}`, class: {'fc-upload': true}}, render)];
    }

    cacheParse() {
        return this.parse();
    }

    makeUploadView(src, key, index) {
        return this.vNode.make('div', {key: `div1${key}`, class: {'fc-files': true}}, () => {
            let container = [];
            if (this.handler.rule.props.uploadType === 'image') {
                container.push(this.vNode.make('img', {key: `img${key}`, attrs: {src}}));
            } else {
                container.push(this.vNode.icon({key: `file${key}`, props: {type: iviewConfig.fileIcon, size: 40}}))
            }
            if (this.issetIcon)
                container.push(this.makeIcons(src, key, index));
            return container;
        });
    }

    makeIcons(src, key, index) {
        return this.vNode.make('div', {key: `div2${key}`, class: {'fc-upload-cover': true}}, () => {
            let icon = [];
            if (!!this.uploadOptions.handleIcon)
                icon.push(this.makeHandleIcon(src, key, index));
            if (this.uploadOptions.allowRemove === true)
                icon.push(this.makeRemoveIcon(src, key, index));
            return icon;
        });
    }

    makeProgress(file, unique) {
        return this.vNode.make('div', {key: `div3${unique}`, class: {'fc-files': true}}, [
            this.vNode.progress({key: `upp${unique}`, props: {percent: file.percentage, hideInfo: true},style:{width:'90%'}})
        ]);
    }

    makeUploadBtn(unique, isShow) {
        return this.vNode.upload(this.propsData,
            isShow === true ? [
                this.vNode.make('div', {key: `div5${unique}`, class: {'fc-upload-btn': true}}, [
                    this.vNode.icon({
                        key: `upi${unique}`,
                        props: {
                            type: this.handler.rule.props.uploadType === 'file' ? iviewConfig.fileUpIcon : iviewConfig.imgUpIcon,
                            size: 20
                        }
                    })
                ])
            ] : []);
    }

    makeRemoveIcon(src, key, index) {
        return this.vNode.icon({
            key: `upri${key}${index}`, props: {type: 'ios-trash-outline'}, nativeOn: {
                'click': () => {
                    this.handler.el.fileList.splice(index, 1);
                    this.handler.changeParseValue(this.handler.el.fileList);
                    this.sync();
                    this.propsData.props.onRemove && this.propsData.props.onRemove(this.handler.el.fileList);
                }
            }
        });
    }

    makeHandleIcon(src, key, index) {
        return this.vNode.icon({
            key: `uphi${key}${index}`, props: {type: toString(this.uploadOptions.handleIcon)}, nativeOn: {
                'click': () => {
                    this.onHandle(src);
                }
            }
        });
    }
}

const types = {
    image: ['image', 0],
    file: ['file', 0],
    uploadFileOne: ['file', 1],
    uploadImageOne: ['image', 1],
};

const maker = Object.keys(types).reduce((initial, key) => {
    initial[key] = creatorTypeFactory(name, m => m.props({uploadType: types[key][0], maxLength: types[key][1]}));
    return initial
}, {});

maker.uploadImage = maker.image;
maker.uploadFile = maker.file;

export default {handler, render, maker, name};
